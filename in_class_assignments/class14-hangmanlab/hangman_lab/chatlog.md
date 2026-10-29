# AI Chat Log: hangman_client.py Bug Fixing and Error Handling

- **Course:** CSE 4095 Agentic Programming, Hangman REST API Lab
- **Student:** Alexander Grejdus (ajg22021)
- **Date:** 2026-10-22
- **Assistant:** Claude (Opus 5.5) in Claude Code
- **Scope:** Only the exchanges where I asked for help debugging `hangman_client.py` or adding error handling. Long code pastes are replaced with `[pasted ...]`, and the assistant's replies are condensed to their main points and code.

---

## 1. `create_game` request not working

**Me:**

```python
BASE_URL = "https://hangman-ex89.onrender.com"
POST_URL = "https://hangman-ex89.onrender.com/api/games"
GET_URL = "https://hangman-ex89.onrender.com/api/games/"

def create_game(difficulty):
    payload = {"difficulty":difficulty}
    r = requests.post(POST_URL, params = payload)
    print(r.text)

return r
```

**Claude:**

Two bugs:

1. `params=` sends the difficulty in the URL query string (`POST /api/games?difficulty=easy`) with no body. Sending that request to the server returned:
   ```
   HTTP/2 400
   {"error":"request body must be a JSON object"}
   ```
   Use `json=payload`, which sends a JSON body and sets `Content-Type: application/json`.
2. `return r` is not indented, so Python raises `SyntaxError: 'return' outside function`.

Also suggested returning `r.json()` instead of the response object, moving printing to `main()`, calling `r.raise_for_status()`, adding a timeout, and building URLs from `BASE_URL`.

---

## 2. `InvalidSchema` traceback in `get_game`

**Me:**

```
4370af9dddc7
Traceback (most recent call last):
  File ".../hangman_lab/hangman_client.py", line 36, in <module>
    game = get_game(game_id)
  File ".../hangman_lab/hangman_client.py", line 16, in get_game
    r = requests.get(GET_URL.join(game_id));
  ...
requests.exceptions.InvalidSchema: No connection adapters were found for
'4https://hangman-ex89.onrender.com/api/games/3https://hangman-ex89.onrender.com/api/games/7...'
```

**Claude:**

`str.join` does not concatenate two strings. It treats `game_id` as a sequence of characters and puts `GET_URL` between each one:

```python
"-".join("abc")   # 'a-b-c'
```

So the URL became `4` + URL + `3` + URL + ..., which starts with `4https://`, and `requests` could not recognize it. Fix it with an f-string:

```python
r = requests.get(f"{BASE_URL}/api/games/{game_id}", timeout=TIMEOUT)
```

Tip: when you get `InvalidSchema`, print the URL first.

---

## 3. `make_guess` returns "difficulty is required"

**Me:**

```
{'guessed_letters': [], 'incorrect_letters': [], 'pattern': '_ _ _ _ _ _', 'remaining_guesses': 6, 'status': 'playing'}
{'error': 'difficulty is required'}
```

```python
def make_guess(game_id, letter):
    payload = {"letter":letter}
    r = requests.post(POST_URL, json = payload)

    return ast.literal_eval(r.text)
```

**Claude:**

The guess was sent to `POST_URL` (`/api/games`), the create-game endpoint, so the server treated it as a new game with no difficulty. `game_id` was never used. Send it to the guess endpoint:

```python
r = requests.post(f"{BASE_URL}/api/games/{game_id}/guess", json={"letter": letter}, timeout=TIMEOUT)
```

Also replace `ast.literal_eval(r.text)` with `r.json()`: `literal_eval` parses Python syntax, so JSON values like `true`, `false`, and `null` would crash it. Without `raise_for_status()`, the error came back as a normal dict and the program could not tell it apart from a game state.

---

## 4. Checking the client against the lab requirements

**Me:** `[pasted full hangman_client.py]` Can you check the requirements

**Claude:**

Requirements 1 to 7 passed. Two failed:

- **#8 Display the final result:** only a loss printed a message, a win printed nothing.
- **#9 Handle errors gracefully:** no error handling. A connection failure crashed with a traceback, a server error reply made `status` `None` so the loop quietly ended, an HTML error page would crash `ast.literal_eval`, and with no timeout a slow server could hang forever.

Bugs found:

- `guessResponse.get("incorrect_guesses")` uses the wrong key. The server field is `incorrect_letters`, so it always printed `None`.
- `main()` only contained `pass`; all logic was in the `if __name__` block.
- `guessResponse.get("word")` prints `None` if the server does not send the word on a loss.

---

## 5. Win message counting the wrong number

**Me:** `[pasted hangman_client.py with an added win message]` How about now

```python
if(status == "won"):
        print("\n CONGRATULATIONS, YOU WON IN ", 6-remaining_guesses, " GUESSES!")
```

**Claude:**

#8 now passes, but `6 - remaining_guesses` counts only the **wrong** guesses, because `remaining_guesses` only goes down on a miss. Winning with no misses would print "YOU WON IN 0 GUESSES". The `6` is also hardcoded. Count from the server's data instead:

```python
print(f"\n CONGRATULATIONS, YOU WON IN {len(guessed_letters)} GUESSES!")
```

#9 (error handling) was still not done.

---

## 6. Adding error handling and game-state printing

**Me:** `[pasted full hangman_client.py]` PLease only ADD lines to this code, add the necessary error handling and printing game state

**Claude:**

Added lines only. A script confirmed every original line is still there, in the same order.

- **`handle_errors` decorator** placed above `create_game`, `get_game`, and `make_guess`, so the existing function bodies did not change:

  ```python
  def handle_errors(func):
      """Exit with a clear message on connection errors, unreadable responses, or server error replies."""
      def wrapper(*args, **kwargs):
          try:
              data = func(*args, **kwargs)
          except requests.RequestException as e:
              print(f"\nError: could not communicate with the server ({e})")
              sys.exit(1)
          except (ValueError, SyntaxError):
              print("\nError: the server sent a response that could not be read")
              sys.exit(1)
          if not isinstance(data, dict):
              print("\nError: unexpected response format from the server")
              sys.exit(1)
          if "error" in data:
              print(f"\nError from server: {data['error']}")
              sys.exit(1)
          return data
      return wrapper
  ```

- **`show_state(game)`** prints the word, remaining guesses, guessed letters, incorrect letters, and status. Called after creating the game and after every guess.
- A "Connecting..." message, a check that the server returned a `game_id`, and a message if the game ends with a status other than `won` or `lost`.

**Tests run:**

| Test | Result |
|---|---|
| Fake game id | `Error from server: unknown game`, clean exit |
| Server unreachable | `Error: could not communicate with the server (...)`, clean exit |
| HTML page instead of JSON | `Error: the server sent a response that could not be read`, clean exit |
| Full easy game | Won on "clear" in 10 guesses, status `"won"` confirmed |

Not fixable without changing existing lines: the `"incorrect_guesses"` key, adding `timeout=` to the requests, and moving the logic into `main()`.
