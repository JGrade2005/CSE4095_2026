"""
Stack-based mathematical expression evaluator.

Takes an infix expression like "(1+5)/6-2*3" from the command line,
converts it to postfix (Reverse Polish Notation) with the Shunting-Yard
algorithm using an operator stack, then evaluates the postfix expression
using a value stack. No eval() / exec() is used anywhere.
"""

import sys
import re

PRECEDENCE = {'+': 1, '-': 1, '*': 2, '/': 2}
TOKEN_PATTERN = re.compile(r'\d+\.\d+|\d+|[()+\-*/]')


def is_number(token):
    return bool(re.fullmatch(r'\d+(\.\d+)?', token))


def tokenize(expression):
    """Split the expression into numbers, operators, and parentheses."""
    cleaned = expression.replace(' ', '')
    if not cleaned:
        raise ValueError("Empty expression")
    tokens = TOKEN_PATTERN.findall(cleaned)
    if ''.join(tokens) != cleaned:
        raise ValueError(f"Invalid character in expression: {expression!r}")
    return tokens


def mark_unary_minus(tokens):
    """Rewrite a '-' that acts as a unary sign (e.g. -3, (-3)) as '~'."""
    marked = []
    prev = None
    for token in tokens:
        if token == '-' and (prev is None or prev in PRECEDENCE or prev == '('):
            marked.append('~')
        else:
            marked.append(token)
        prev = token
    return marked


def infix_to_postfix(tokens):
    """Shunting-Yard algorithm: convert infix tokens to postfix using a stack."""
    output = []
    operator_stack = []  # <-- THE STACK (operators / parentheses)
    steps = []

    def record(token, action):
        steps.append({
            'token': token,
            'action': action,
            'stack': list(operator_stack),
            'output': list(output),
        })

    for token in tokens:
        if token == '~':
            operator_stack.append(token)
            record(token, "push unary '-' onto operator stack")

        elif is_number(token):
            output.append(token)
            record(token, f"number {token} -> straight to output")

        elif token == '(':
            operator_stack.append(token)
            record(token, "push '(' onto operator stack")

        elif token == ')':
            while operator_stack and operator_stack[-1] != '(':
                popped = operator_stack.pop()
                output.append(popped)
                record(token, f"pop '{popped}' to output (unwinding parenthesis)")
            operator_stack.pop()  # discard the '('
            record(token, "discard matching '(' from stack")

        else:  # binary operator: + - * /
            while (operator_stack and operator_stack[-1] != '(' and
                   (operator_stack[-1] == '~' or
                    PRECEDENCE.get(operator_stack[-1], 0) >= PRECEDENCE[token])):
                popped = operator_stack.pop()
                output.append(popped)
                record(token, f"pop '{popped}' first (>= precedence of '{token}')")
            operator_stack.append(token)
            record(token, f"push '{token}' onto operator stack")

    while operator_stack:
        popped = operator_stack.pop()
        output.append(popped)
        steps.append({
            'token': '',
            'action': f"pop remaining '{popped}' into output",
            'stack': list(operator_stack),
            'output': list(output),
        })

    return output, steps


def evaluate_postfix(postfix_tokens):
    """Evaluate a postfix expression using a value stack."""
    value_stack = []  # <-- THE STACK (numeric values)
    steps = []

    for token in postfix_tokens:
        if is_number(token):
            value_stack.append(float(token))
            steps.append({
                'token': token,
                'action': f"push {token}",
                'stack': list(value_stack),
            })

        elif token == '~':
            a = value_stack.pop()
            result = -a
            value_stack.append(result)
            steps.append({
                'token': token,
                'action': f"pop {format_number(a)}, negate -> push {format_number(result)}",
                'stack': list(value_stack),
            })

        else:
            b = value_stack.pop()
            a = value_stack.pop()
            if token == '+':
                result = a + b
            elif token == '-':
                result = a - b
            elif token == '*':
                result = a * b
            elif token == '/':
                if b == 0:
                    raise ZeroDivisionError("division by zero")
                result = a / b
            value_stack.append(result)
            steps.append({
                'token': token,
                'action': (f"pop {format_number(b)} and {format_number(a)}, "
                           f"compute {format_number(a)} {token} {format_number(b)} "
                           f"= {format_number(result)}, push result"),
                'stack': list(value_stack),
            })

    return value_stack.pop(), steps


def format_number(n):
    if float(n).is_integer():
        return str(int(n))
    return str(round(n, 10))


def solve(expression):
    """Run the full pipeline and return everything needed to display steps."""
    tokens = tokenize(expression)
    tokens = mark_unary_minus(tokens)
    postfix, convert_steps = infix_to_postfix(tokens)
    result, eval_steps = evaluate_postfix(postfix)
    return postfix, convert_steps, eval_steps, result


def print_solution(expression):
    tokens = tokenize(expression)
    display_tokens = ' '.join(t for t in tokens)
    marked = mark_unary_minus(tokens)
    postfix, convert_steps = infix_to_postfix(marked)
    result, eval_steps = evaluate_postfix(postfix)

    print(f"\nExpression: {expression}")
    print(f"Tokens: {display_tokens}")

    print("\n--- Step 1: infix -> postfix (Shunting-Yard, operator stack) ---")
    for i, step in enumerate(convert_steps, 1):
        stack_str = ' '.join(step['stack']) or '(empty)'
        output_str = ' '.join(step['output']) or '(empty)'
        tok = step['token'] or ' '
        print(f" {i:2}. token='{tok:<2}'  {step['action']:<48} "
              f"stack=[{stack_str}]  output=[{output_str}]")

    print(f"\nPostfix (RPN): {' '.join(postfix)}")

    print("\n--- Step 2: evaluate postfix (value stack) ---")
    for i, step in enumerate(eval_steps, 1):
        stack_str = ' '.join(format_number(v) for v in step['stack']) or '(empty)'
        print(f" {i:2}. token='{step['token']:<2}'  {step['action']:<55} "
              f"stack=[{stack_str}]")

    print(f"\nResult: {expression} = {format_number(result)}")


def main():
    if len(sys.argv) > 1:
        expression = ' '.join(sys.argv[1:])
        try:
            print_solution(expression)
        except (ValueError, ZeroDivisionError, IndexError) as e:
            print(f"Error: {e}")
        return

    print("Stack-Based Expression Evaluator")
    print("Enter a math expression using + - * / and parentheses.")
    print("Type 'quit' to exit.")
    while True:
        try:
            expression = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if expression.lower() in ('quit', 'exit'):
            break
        if not expression:
            continue
        try:
            print_solution(expression)
        except (ValueError, ZeroDivisionError, IndexError) as e:
            print(f"Error: {e}")


if __name__ == '__main__':
    main()
