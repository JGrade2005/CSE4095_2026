import requests
import ast
import sys

BASE_URL = "https://hangman-ex89.onrender.com"
POST_URL = "https://hangman-ex89.onrender.com/api/games"
GET_URL = "https://hangman-ex89.onrender.com/api/games/"


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


def show_state(game):
    print("\n-----------------------------------------")
    print("word:              ", game.get("pattern"))
    print("remaining guesses: ", game.get("remaining_guesses"))
    print("guessed letters:   ", ", ".join(game.get("guessed_letters", [])) or "none")
    print("incorrect letters: ", ", ".join(game.get("incorrect_letters", [])) or "none")
    print("status:            ", game.get("status"))
    print("-----------------------------------------")


@handle_errors
def create_game(difficulty):
    payload = {"difficulty":difficulty}
    r = requests.post(POST_URL, json = payload)
   
    return ast.literal_eval(r.text)


@handle_errors
def get_game(game_id):
    r = requests.get(f"{GET_URL}{game_id}");
    
    return ast.literal_eval(r.text)

@handle_errors
def make_guess(game_id, letter):
    payload = {"letter":letter}
    r = requests.post(f"{GET_URL}{game_id}/guess", json = payload);
       
    return ast.literal_eval(r.text)


def main():
    pass


if __name__ == "__main__":
    print("Connecting to the Hangman server (this can take up to a minute if it is asleep)...")
    new_game = create_game("easy")
    print(new_game)
    if not new_game.get("game_id"):
        print("\nError: the server did not return a game id")
        sys.exit(1)
    print("\nNew game created! Game ID:", new_game.get("game_id"))
    show_state(new_game)

    game_id = new_game.get("game_id")
    pattern = new_game.get("pattern")
    remaining_guesses = new_game.get("remaining_guesses")
    status = new_game.get("status")
    guessed_letters = new_game.get("guessed_letters")

    while(status == "playing"):
        print(pattern)
        while True:
            try:
                guess = input("Enter a letter to guess: ").lower()
                
                guessNotMade = True
                
                if(guessed_letters is not None):
                    guessNotMade = not (guess in guessed_letters)

                if not (len(guess) == 1 and guess.isalpha()):
                    raise ValueError("Invalid character")
                elif not (guessNotMade):
                    raise ValueError("Guess already made")
                else:
                    break
            except ValueError as e:
                print(f"Error: {e}")

        guessResponse = make_guess(game_id, guess)
        pattern = guessResponse.get("pattern")
        remaining_guesses = guessResponse.get("remaining_guesses")
        status = guessResponse.get("status")
        guessed_letters = guessResponse.get("guessed_letters")
        show_state(guessResponse)

        if(status == "lost"):
                print("\n You Lost! The word was : ", guessResponse.get("word"))

        if(status == "won"):
                print("\n =========================================")
                print("\n CONGRATULATIONS, YOU WON IN ", len(guessed_letters), " GUESSES!")
                print("\n =========================================")

    if status not in ("won", "lost"):
        print("\nGame ended with an unexpected status:", status)

        


    


    main()
