---
title: "GPT-2 --> Llama 3, Part 2: Optimizing for generation"
author: "Abdalrahman Wael"
authorGithub: "AbdalrahmanWael"
date: 2026-06-08
excerpt: "A walkthrough of why generation changes transformer attention, how KV cache cuts repeated work, and why Llama-style grouped-query attention shrinks inference memory."
tags:
  - llms
  - transformers
  - llama
  - inference
thumbnail: /assets/images/blog/gpt2-to-llama3/kv-cache-gqa-cover.png
---

Last time [in part 1](/en/blogs/gpt-2-to-llama-3-one-improvement-at-a-time/), we were poking at the inside of the transformer block. Position felt awkward, so we moved it into attention with RoPE. LayerNorm felt a bit heavier than needed, so we kept the scale control with RMSNorm. The MLP felt too rigid, so we gave it a gate with SwiGLU.

That made the model better in our small setup. But modern LLMs are not just trained; they are served. Now that language models are useful, a new kind of pressure shows up: generation has to be fast, cheap, and memory-efficient.

So in this part, we stop thinking only like training people and start thinking like inference people. What changes when the model has to produce tokens one at a time, for many users, at scale?

There is much much much here to talk about and investigate, and inference optimization is a hot topic. we are going to look at some of that, in terms of what improvements can we make to make inference better given this new pressure we now face.


## Generation Is Autoregressive
During training, the model sees a whole sequence at once:

`Mary found a shiny rock`

But during generation, it is doing this annoying little loop:

- read the prompt
- predict one token
- append it
- read the longer prompt
- predict one token
- append it again

and we keep doing this again and again to produce a sentence, and the model keeps recomputing the same old keys and values for the same old prefix again and again and again.

At token 50, it recomputes the prefix.
At token 51, it recomputes almost the same prefix.
At token 52, same thing.

Now you might be catching onto the obvious conclusion here. which is why are we recomputing and doing all this again, seems like a waste can't we store them for later?


## KV Cache

And yes indeed, dear reader, that is basically the whole idea behind something called 'KV cache'

When we generate a new token, the old prefix has not changed. The token `Mary`
from 40 steps ago is still the same token. Its key is still the same key. 
Its value is still the same value.

So instead of recomputing all the keys and values for the whole prefix every
time, we keep them around.

The current token still needs a fresh query, because it is the token asking the
new question. But the older tokens already advertised their keys and already
prepared their values. We can just reuse those no?


So decoding changes from:

- recompute K and V for the whole prefix
- compute the new query
- attend over everything

to:

- load old K and V from cache
- compute K and V only for the new token
- compute the new query
- attend over cached history plus the new token


Cool, so we stopped recomputing the old keys and values.
But of course nothing is free.
Now we have to store those keys and values for every generated token, in every layer, for every request we are serving.

## The Cache Gets Big

For one token, storing keys and values does not sound scary.

But the cache is not for one token. It grows with:

- number of layers
- number of KV heads
- head dimension
- context length
- batch size / number of users

KV cache size roughly scales like:

```text
2 × batch_size × n_layers × context_length × n_kv_heads × head_dim × bytes_per_element
```

The 2 is because we store both keys and values.

So as generation gets longer, the model is no longer only doing math. It is also dragging around a growing memory history.


## Queries And KV Do Not Have The Same Job Anymore

The important thing to notice is that the query does not live the same life as the keys and values anymore.

When we are generating token 52, the query is just for token 52. It is the new token asking:

"what should I look at?"

But the keys and values are different. They are not just temporary things inside one forward pass anymore. After KV cache, they become the stored memory of the whole prefix.

Token 1 has a key and value.
Token 2 has a key and value.
Token 3 has a key and value.

And we keep all of them around so the new token can attend back to them.

So in decoding, Q is fresh and temporary, while K and V are historical and persistent.

That is the asymmetry.

And once you see that asymmetry, the old GPT-2 attention shape starts to feel a little suspicious. In GPT-2, we usually make Q, K, and V together with one big projection:

```python
q, k, v = self.Wqkv(x).split(...)
```
Very clean. Very convenient.

But it also quietly assumes that queries, keys, and values should all have the same head structure. but there isn't really a reason stopping us from doing otherwise.

During training, that feels natural enough.

During generation, maybe not.

Because the expensive thing we are now storing and moving around is not really the query. The query is only for the current token. The expensive thing is the pile of old keys and values sitting in the cache.

So could we somehow change the head structure of the more expensive things we store? the first thought is what we want to make them smaller? can we do that? Well we should simply try if that's gonna work.

So the first move is simple: stop forcing Q, K, and V to be born from the same projection.

## Split Q, K, and V

In the GPT-2-style attention block, we often do something like this:

```python
q, k, v = self.Wqkv(x).split(self.n_embed, dim=-1)
```

One input goes into one big projection, and out comes Q, K, and V.

Cute. Clean. Very satisfying.


But if we want the query side and the KV side to have different shapes, this combined projection starts getting in the way. It ties everything together.

So in the Llama-style version, we split them:

```python
self.Wq = nn.Linear(n_embed, n_embed, bias=False)
self.Wk = nn.Linear(n_embed, n_kv_heads * head_dim, bias=False)
self.Wv = nn.Linear(n_embed, n_kv_heads * head_dim, bias=False)
```

Now the query projection can still produce all the query heads:

```python
q = self.Wq(x)
```
but the key and value projections can produce fewer heads:
```python
k = self.Wk(x)
v = self.Wv(x)
```
We didn't do anything weird yet, we just split them and made the code more explicit. now we can choose to keep the same number of heads everywhere as we did before, but now we can also choose separately:

how many query heads we want
how many key/value heads we want

So now we can do our experiment of letting them have different shapes, but what does it mean if query heads are different from KV heads?

<figure>
  <img src="/assets/images/blog/gpt2-to-llama3/mha-head-sharing.png" alt="Multi-head attention diagram" loading="lazy" decoding="async" />
</figure>

## MHA, MQA, and GQA

Well, In our first extreme which is the normal multi-head attention, every query head gets its own key/value head.

That means every kind of question (Query) gets its own private memory bank.

This is expressive and works well, but expensive once the memory bank is literally being stored in the KV cache, as it has to store keys and values for every head, for every old token, in every layer.

If we have 4 query heads, we also have 4 key heads and 4 value heads.

Q heads:  Q0  Q1  Q2  Q3
K/V:      KV0 KV1 KV2 KV3

With Each query having its own private memory bank. you might think hmmmm, can we make the Query heads share the same memory bank which is the K/V heads?

The most aggressive version is multi-query attention, or MQA.

Q heads:  Q0  Q1  Q2  Q3
K/V:      KV0 KV0 KV0 KV0

<figure>
  <img src="/assets/images/blog/gpt2-to-llama3/mqa-head-sharing.png" alt="Multi-query attention diagram" loading="lazy" decoding="async" />
</figure>

Now all query heads look into the same key/value memory.

This makes the cache much smaller. But it also feels maybe a bit too aggressive. Every query head can still ask a different question, but they are all searching through the same compressed memory bank. And the performance of the models does degrade more noticeably with this setup. perhaps a middle ground would be nicer?

That middle ground is called GQA, grouped-query attention

Q heads:  Q0  Q1  Q2  Q3
K/V:      KV0 KV0 KV1 KV1

<figure>
  <img src="/assets/images/blog/gpt2-to-llama3/gqa-head-sharing.png" alt="Grouped-query attention diagram" loading="lazy" decoding="async" />
</figure>


Instead of every query head getting a private KV head, and instead of all query heads sharing one KV head, groups of query heads share KV heads. So not as aggressive and limiting as the MQA and not as expressive but expensive as the MHA. And basically we are managing a compromise between the two extremes.

Many query heads means the current token can ask several kinds of questions. But maybe every question does not need its own private copy of the prefix memory.


## What This Changes In The Cache

If MHA has 32 query heads and 32 KV heads, the cache stores 32 heads worth of keys and 32 heads worth of values.

If GQA has 32 query heads but only 8 KV heads, the cache stores 8 heads worth of keys and values.

The important thing is that the cache depends on KV heads, not query heads.

So if we keep 32 query heads but reduce KV heads from 32 to 8, the current token can still ask many kinds of questions, but the stored prefix memory is four times smaller on the head axis.

That is the whole practical reason GQA matters.

The query side is still kinda rich.
The stored history is smaller.

But... you might be having a question now which is are we still degrading performance? are we losing too much performance for the memory gain we are making?

And the honest answer is yeah, there can be some degradation, but GQA is chosen because the KV-cache memory and memory-bandwidth savings are usually worth that tradeoff, especially as models and contexts get larger. And these gains are more obvious in larger models. if you try all this with a tiny language model, you will still see the effect but it's gonna be small and noisy. I also recommend reading the [GQA paper](https://arxiv.org/abs/2305.13245) to see their benchmarks

Very cool no? We come so far since our starting gpt-2 block, improving it one piece at a time. so what's next? well we are kinda done, but there is some terminology and useful distinctions that we didn't mention yet. so let's go over them first.

## Prefill and Decode

So when you give the model a prompt, the model still has to process that prompt once. If the prompt is:

`The old wizard opened the wooden door`

we cannot magically skip those tokens. We run the model over the prompt and build the first KV cache.

That part is called prefill.

Prefill is the "read the prompt" phase.

After that comes decode.

Decode is the annoying one-token-at-a-time loop. Now the cache is already there, so each new token only needs to add its own new key and value, then attend back over the cached history.

So basically summary generation has two different shapes:

- prefill: process many prompt tokens in parallel and create the cache
- decode: process one new token at a time while reusing the cache

This matters because many inference optimizations are really about which phase you are trying to make cheaper.


## How This Looks In Code

Ok so what does all this look like in code?

The main thing is that we now separate the number of query heads from the number of key/value heads.

So we might have:

```python
n_heads = 32
n_kv_heads = 8
```

and then the sharing ratio is:

```python
group_size = n_heads // n_kv_heads
```

So here every KV head is shared by 4 query heads.

The query projection still produces all the query heads:

```python
self.Wq = nn.Linear(n_embed, n_embed, bias=False)
```

but keys and values produce fewer heads:

```python
self.Wk = nn.Linear(n_embed, n_kv_heads * head_dim, bias=False)
self.Wv = nn.Linear(n_embed, n_kv_heads * head_dim, bias=False)
```

So after reshaping, the tensors do not have the same head count anymore:

```python
q: (B, n_heads, T, head_dim)
k: (B, n_kv_heads, T, head_dim)
v: (B, n_kv_heads, T, head_dim)
```

and this is the whole point.

The cache stores the smaller K and V shape:

```python
cache_k: (B, n_kv_heads, cached_tokens, head_dim)
cache_v: (B, n_kv_heads, cached_tokens, head_dim)
```

Then when attention happens, the query heads still need to attend to the cached K/V history. Some attention kernels know how to do GQA directly. If not, you can logically repeat the K/V heads so they line up with the query heads.

But the important thing is this:

we don't want to store the repeated version.

The repeated KV view is only for the attention computation. The cache itself stays compact.

And that is why this whole thing was worth doing.


## Tiny Trap: The Cache Mask

There is a small implementation trap here that is easy to miss.

During training, attention usually has a nice square shape.

If the sequence length is 512, queries, keys, and values all have length 512. So the causal mask is basically a 512 by 512 triangle.

But during cached decoding, the shape is different.

The current query might only be one token:

```python
q_len = 1
```

but the keys and values include the whole cached prefix:

```python
k_len = past_tokens + 1
```

So the mask is not really the simple training mask anymore. The new token should be allowed to look at the old cached tokens, but not at future tokens that do not exist.

This is also why you have to be careful with position.

If we are decoding token 52, its RoPE position should be 52, not 0 just because the current input chunk has length 1.

So with KV cache there are two little things to keep honest:

- the causal mask has to be sliced for the cached shape
- RoPE has to know the real position after the cached prefix

If either of those is wrong, the model can still run, which is the annoying part. It might just quietly generate different text or fail the cached-vs-uncached comparison.

That is why a good first test for KV cache is simple:

run generation with cache, run it without cache, use greedy decoding, and make sure the outputs match.


## Conclusion

So now we have kind of finished the dense GPT-2 to Llama-style path.

In part one, we changed the inside of the block:

- RoPE moved position into the query-key matching
- RMSNorm kept the scale control and dropped the recentering
- SwiGLU made the MLP more selective

In this part, we looked at what changes once generation becomes the pressure:

- KV cache stops us from recomputing old keys and values
- prefill and decode explain the two shapes of generation
- split Q/K/V gives queries and KV different shapes
- GQA keeps many query heads but stores fewer KV heads

So the model is no longer really a GPT-2-style block with a few small edits.

It is now much closer to the dense Llama-style shape:

- position is handled by RoPE
- normalization is RMSNorm
- the MLP is SwiGLU
- attention uses split projections
- decoding can use a KV cache
- the cache can stay smaller through GQA

Of course this is still not all of inference optimization. There is a whole other world of batching, paged KV cache, quantization, speculative decoding, attention kernels, distributed serving, and many other tricks.

But those are not really the architectural jump from GPT-2 to a Llama-style transformer.

The main architectural story is simpler:

first we made the block cleaner for modeling.

then we made the attention stack better shaped for generation.

And that is enough for this series. I would recommend you go and try to implement and do ablation tests at each point on a dataset of your choosing to really have it all stick together, as well as checking the papers and using them as reference, have fun!

## Resources

- [Ainslie et al., "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints"](https://arxiv.org/abs/2305.13245)
- [Shazeer, "Fast Transformer Decoding: One Write-Head is All You Need"](https://arxiv.org/abs/1911.02150)
- [Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention"](https://arxiv.org/abs/2309.06180)
- [Meta, "Introducing Meta Llama 3"](https://ai.meta.com/blog/meta-llama-3/)
- [Meta Llama 3 model card](https://github.com/meta-llama/llama3/blob/main/MODEL_CARD.md)

## Original Version

This post is also published on [my personal blog](https://www.abdalrahman.computer/writing/2026-06-08-gpt-2-to-llama-3-part-2-kv-cache-gqa-generation/).
