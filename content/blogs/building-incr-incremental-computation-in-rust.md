---
title: "Building incr: A Student's Dive into Incremental Computation in Rust"
author: "Khaled Alam"
authorGithub: "k5602"
date: 2026-08-20
excerpt: "A look into push versus pull incremental computation, early cutoffs, and how I designed the core architecture and procedural macros for incr."
tags:
  - rust
  - compilers
  - incremental-computation
  - open-source
---

If you write code in an IDE, you expect instant feedback, You type a character, and the editor highlights syntax errors, auto-completes methods, and runs type checks without freezing.

Running a full compiler pipeline from scratch on every keystroke takes seconds or minutes on large codebases, Language servers like `rust-analyzer` cannot do that. Instead, they reuse previous work and recompute only what actually changed. This idea is called incremental computation (or self-adjusting computation).

Over the past few months, I spent a lot of time reading papers and studying how different systems solve this problem. That research led me to start [`incr`](https://github.com/k5602/incr), an experimental pull-based incremental computation library written in Rust.

Here is what I learned about the push versus pull debate, how early cutoffs save CPU cycles, and how the internals of `incr` work.

## Two schools: push versus pull

Incremental systems generally fall into two categories: push-based and pull-based.

### Push-based (reactive dataflow)

Push systems react immediately when data changes. When you update an input, the system pushes new values downstream through a dependency graph to all listeners.

Notable examples include:
- **Jane Street's Incremental and Bonsai:** Used in OCaml for trading UIs and reactive web interfaces.
- **Differential Dataflow and Materialize:** Used for continuous database queries and streaming views.
- **Modern UI signals (SolidJS, S.js):** Fine-grained reactivity where variable updates trigger bound DOM nodes.

Push-based systems work well when outputs are continuously displayed on a screen or streamed over a socket. Every input update propagates immediately.

The downside shows up when inputs change faster than consumers read the results. If ten intermediate variables update before a user looks at the screen, a pure push engine might recompute intermediate nodes ten times. Handling dynamic dependency graphs, where conditional branches change what a function depends on at runtime, also adds complexity.

### Pull-based (demand-driven queries)

Pull systems are lazy. When an input changes, the engine does not recompute anything immediately. It records a version change and waits.

When a caller explicitly asks for a query result, the engine inspects the dependencies of that query, checks whether those dependencies changed, and recomputes only the stale paths.

Notable examples include:
- **Salsa:** The query engine behind `rust-analyzer`.
- **Adapton:** Research by Matthew Hammer and Umut Acar on demand-driven incremental computation with early cutoff.
- **Build systems (Shake, Bazel):** Target outputs are computed only when requested by the user.

Pull-based systems fit compiler and IDE workloads well. A user might type fifty characters in a comment. The IDE only needs to compute type diagnostics for the file currently open on screen, rather than updating every AST node in the workspace.

## Early cutoff: the secret to avoiding cascading work

The core mechanism that makes pull-based systems fast is early cutoff (often related to the red-green algorithm).

Imagine this query pipeline:

```text
source_file (input)
  -> parse_ast (query)
    -> type_check (query)
      -> codegen (query)
```

Suppose a user adds a space or a comment inside a function body:
1. The `source_file` input changes, bumping the revision counter.
2. The caller requests `codegen`.
3. The engine verifies `type_check`, which in turn verifies `parse_ast`.
4. `parse_ast` re-runs because the raw text changed. It produces a new AST.
5. The engine compares the new AST with the previous AST using equality (`==`).
6. Because comments and whitespace do not change the AST structure, the new AST is identical to the old one.
7. The engine keeps the old timestamp on `parse_ast`.
8. The engine returns to `type_check` and `codegen`. Since their input (`parse_ast`) did not produce a different value, both skip recomputation completely.

Without early cutoff, every keystroke would trigger a full cascade down the entire dependency tree.

## Why build incr?

Salsa is the standard for query-based computation in Rust, and it is well engineered. But Salsa has a steep learning curve. It uses query groups, storage traits, durability levels, and complex lifetime management.

I wanted a library with a minimal core that a student or developer could read, understand, and hack on:
- One global revision counter (`Epoch`).
- Automatic change detection through `Eq` cutoff, without manual durability annotations.
- Plain struct databases with clean attribute macros.
- Simple, traceable dependency tracking.
- and mainly it's a personal project so I could deepen Rust knowledge and experiment with incremental computation.

## How incr works under the hood

The `incr` design consists of four main parts: epochs, input storage, memoization, and procedural macros.

### 1. Revision tracking with epochs

Every database instance tracks time with a single monotonically increasing counter:

```rust
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash, Debug, Default)]
pub struct Epoch(pub u64);
```

Whenever you update an input, the database increments its epoch and tags the input with the current epoch.

### 2. Input storage

Inputs can be single values (`InputField<V>`) or keyed collections (`InputTable<K, V>`). Each entry stores both its data and the epoch when it was last modified:

```rust
#[derive(Clone, Debug, Default)]
pub struct InputTable<K, V> {
    data: HashMap<K, (V, Epoch)>,
}
```

### 3. The memo table

Query results are stored in a memo entry:

```rust
struct Memo<V> {
    value: V,
    verified_at: Epoch,
    changed_at: Epoch,
    deps: Vec<DepId>,
}
```

- `verified_at`: The latest epoch at which the engine confirmed this memo matches its inputs.
- `changed_at`: The epoch when the query value actually changed.
- `deps`: The list of inputs and nested queries this query read during its last execution.

When a query is called:
1. If the memo exists and `verified_at == current_epoch`, return a clone of the cached value immediately.
2. If `verified_at < current_epoch`, inspect each dependency in `deps`.
3. For each dependency, check if its `changed_at` is newer than the memo's `verified_at`.
4. If no dependency changed, update `verified_at = current_epoch` and return the cached value.
5. If any dependency changed, re-run the user's query function. If the new return value equals the old value (`new_val == old_val`), retain the old `changed_at`. Otherwise, set `changed_at = current_epoch`.

### 4. Dependency recording

Dependencies are tracked dynamically. When a query begins execution, the runtime pushes the query ID onto a thread-local stack. When that query calls `db.src(id)` or another query, the runtime records an edge to the current stack frame. When the query finishes, its ID is popped from the stack.

If the engine encounters a query ID that is already present on the current stack, it detects a dependency cycle and reports a cycle error with the full trace.

## The developer experience: procedural macros

Writing boilerplate for query IDs, dependency registrations, and database traits by hand is tedious. In `incr`, procedural macros handle the plumbing.

On the `proc_macro` branch, you define a database and queries with standard Rust syntax:

```rust
use incr::{Db, InputField, InputTable, MemoTable, query};

#[derive(Default, Db)]
struct MyDb {
    #[input]
    src: InputTable<u32, String>,
    #[input]
    config: InputField<String>,
    memo: MemoTable,
}

#[query]
fn parse(db: &MyDb, id: u32) -> Vec<String> {
    db.src(id)
        .split_whitespace()
        .map(|s| s.to_string())
        .collect()
}

#[query]
fn count_words(db: &MyDb, id: u32) -> usize {
    db.parse(id).len()
}
```

The `#[derive(Db)]` macro inspects fields marked with `#[input]` and generates:
- Getter methods (`db.src(id)`) that log a dependency read and return the value.
- Setter methods (`db.set_src(id, val)`) that bump the database epoch and store the updated timestamp.
- Implementation of the internal `Database` trait.

The `#[query]` macro:
- Generates a unique hidden marker struct for `TypeId` resolution.
- Creates a wrapper function that checks the memo table before running the body.
- Generates method syntax on the database struct, allowing both `parse(&db, 1)` and `db.parse(1)`.

Here is an example in action:

```rust
fn main() {
    let mut db = MyDb::default();

    db.set_src(1, "hello BLEU from incr".to_string());
    db.set_config("release".to_string());

    // First call: executes parse and count_words
    assert_eq!(db.count_words(1), 4);

    // Setting the same text: parse re-runs, output is unchanged (Eq cutoff),
    // count_words skips execution.
    db.set_src(1, "hello BLEU from incr".to_string());
    assert_eq!(db.count_words(1), 4);
}
```

## Current status and next steps

The macro layer, input storage, and type machinery are working on the [`proc_macro`](https://github.com/k5602/incr/tree/proc_macro) branch.

The roadmap for the next releases includes:
- **Full runtime memoization hookup:** Connecting the thread-local query stack to the memo table lookup engine.
- **Cycle recovery:** Adding fallback handlers for cyclic queries instead of direct panics.
- **Cache eviction:** Adding LRU eviction based on `verified_at` timestamps to bound memory usage.
- **Snapshot concurrency:** Allowing multi-threaded reads against immutable database snapshots while a writer prepares updates.
- **Benchmarks:** Measuring incremental updates against cold recomputation across large query graphs.

## Let's build it together

I am still an active learner, and building `incr` has been a great way to understand compiler internals and incremental algorithms. There is plenty of room for experimentation with cache eviction, graph traversal, and macro ergonomics.

This project still in early stages, and I am open to feedback and contributions.

So please if you are interested in incremental computation, compilers, or Rust procedural macros, check out the repository on GitHub:

- Repository: [https://github.com/k5602/incr](https://github.com/k5602/incr)
- Active branch: [`proc_macro`](https://github.com/k5602/incr/tree/proc_macro)

Feel free to open an issue, share feedback on the design, or submit a pull request.
