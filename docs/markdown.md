# Markdown Feature Support

This documentation outlines the Markdown features supported by the BLEU Community Blog. Each feature includes the proper syntax and examples for clarity.

---

## Headings

Create headings using the hash (`#`) symbol followed by a space. The number of hashes determines the level.

```md
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
```

---

## Emphasis

You can add emphasis using asterisks (`*`) or underscores (`_`).

### Bold

Wrap text with two asterisks or two underscores.

```md
**This is bold text** __This is also bold text__
```

### Italic

Wrap text with one asterisk or one underscore.

```md
*This is italic text* _This is also italic text_
```

### Bold and Italic

Wrap text with three asterisks or three underscores.

```md
***This is bold and italic text*** ___This is also bold and italic text___
```

---

## Blockquotes

Create blockquotes by prefixing lines with a greater-than symbol.

```md
> This is a blockquote.
> It can span multiple lines if you prefix each line.
```

---

## Lists

### Unordered Lists

Use `-`, `*`, or `+`.

```md
- Item one
- Item two
  - Nested item
```

### Ordered Lists

Use numbers followed by a period.

```md
1. First item
2. Second item
   1. Nested ordered item
```

---

## Code Blocks

### 1. Standard Markdown Syntax

Use three ``` backticks and specify the language name:


![A descriptive alt text](/src/assets/images/code-3.png)



### 2. Nunjucks Syntax

```njk
{% highlight js %}
console.log("Hello from Nunjucks!");
{% endhighlight %}
````

### Supported Languages

| Tag to Type | Displayed Label |
| ----------- | --------------- |
| js          | JS              |
| ts          | TS              |
| html        | HTML            |
| css         | CSS             |
| json        | JSON            |
| python      | Python          |
| php         | PHP             |
| bash        | Bash            |
| sql         | SQL             |
| java        | JAVA            |
| rust        | RUST            |
| cpp         | C++             |
| c           | C               |
| csharp      | C#              |
| diff        | DIFF            |
| example     | example         |

---

## Horizontal Rule

Create a horizontal rule using three or more hyphens:

```md
---
```

---

## Links

```md
[Visit our homepage](https://example.com/)
```

---

## Images

```md
![A descriptive alt text](/images/code.png)
```

---

## Escaping Characters

Prefix characters with a backslash `\` to prevent formatting.

| Character | Name             |
| --------- | ---------------- |
| \         | backslash        |
| `         | backtick         |
| *         | asterisk         |
| _         | underscore       |
| { }       | curly braces     |
| [ ]       | brackets         |
| < >       | angle brackets   |
| ( )       | parentheses      |
| #         | pound sign       |
| +         | plus sign        |
| -         | minus sign       |
| .         | dot              |
| !         | exclamation mark |
| |         | pipe             |

---

## Tables

### Standard Table

```md
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
```

### Table with Alignment

```md
| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|---------------:|
| Left text    | Center text    | Right text     |
| Data         | Data           | Data           |
```
