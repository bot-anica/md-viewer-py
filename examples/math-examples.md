# LaTeX Math Examples

This file demonstrates LaTeX math support in the viewer, rendered via [KaTeX](https://katex.org).

Use `$...$` for inline math and `$$...$$` for block (display) math.

## Inline Math

From ISO 13703:2000:

$NPSH_a = h_p - h_{vpa} + h_{st} - h_f - h_{vh} - h_a$

Where:

- $h_p$ is the absolute pressure head
- $h_{vpa}$ is the absolute vapour pressure of the liquid at suction temperature
- $h_{st}$ is the static head, positive or negative
- $h_f$ is the friction head
- $h_{vh}$ is the velocity head
- $h_a$ is the acceleration head

## Block Math

Quadratic formula:

$$
x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

Euler's identity:

$$e^{i\pi} + 1 = 0$$

## Common Constructs

Fractions and exponents: $\frac{n!}{k!(n-k)!} = \binom{n}{k}$

Greek letters: $\alpha, \beta, \gamma, \Delta, \Omega$

Sums and integrals:

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2} \qquad \int_{0}^{\infty} e^{-x^2} \, dx = \frac{\sqrt{\pi}}{2}
$$

Matrices:

$$
A = \begin{pmatrix} a & b \\ c & d \end{pmatrix}
$$

## Escaping

Currency works as plain text — `$5 and $10` renders untouched because the delimiters require non-whitespace adjacent to the `$`.

To force a literal `$` inside math, escape it: $\\\$$.
