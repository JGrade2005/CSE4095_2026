# sum a and b together
# if the sum is at least 5
# return 0
# otherwise, return a + b
def overflow_sum(a, b):
    if a > 5 or b > 5:
        print("input error.")
        return
    if a < 0 or b < 0:
        print("input error.")
        return
    if a + b >= 5:
        return 0
    else:
        return a + b
    
# this function returns a list of all the possible next moves
# the format is the following
# (the state of player A, the state of player B, level)
# the state of a player is a tuple of two elements
# number of fingers on the left hand, and the number of fingers on the right hand

def next_moves(v):
    L = []
    # if the game is already over, return the empty list
    if v[0] == (0, 0) or v[1] == (0, 0): return L
    # the following depends on whose turn it is
    l0, r0 = v[0][0], v[0][1]
    l1, r1 = v[1][0], v[1][1]
    h = v[2]
    #print(l0, r0, l1, r1, h)
    if h % 2 == 0:
        s = set()
        # to make sure that we do not add zero with other numbers
        if l0 > 0 and l1 > 0:
            item = ((l0, r0), (overflow_sum(l0, l1), r1), h + 1)
            s.add(item)
        if l0 > 0 and r1 > 0:
            item = ((l0, r0), (l1, overflow_sum(l0, r1)), h + 1)
            s.add(item)
        if r0 > 0 and l1 > 0:
            item = ((l0, r0), (overflow_sum(r0, l1), r1), h + 1)        
            s.add(item)
        if r0 > 0 and r1 > 0:
            item = ((l0, r0), (l1, overflow_sum(r0, r1)), h + 1)        
            s.add(item)        

        #move fingers from the left hand to the right hand 
        for i in range(1, l0 + 1):
            l = l0 - i
            # to make sure we do not overflow
            if r0 + i < 5:
                r = overflow_sum(r0, i)
                #print(l, r, l0, r0)
                if (r, l) != (l0, r0):
                    item = ((l, r), (l1, r1), h + 1)
                    s.add(item)
        #move fingers from the right hand to the left hand
        for i in range(1, r0 + 1):
            l = overflow_sum(l0, i)
            r = r0 - i
            #print(l, r, l0, r0)
            if l0 + i < 5:
                if (r, l) != (l0, r0):
                    item = ((l, r), (l1, r1), h + 1)
                    s.add(item)            
    else:
        s = set()
        if l1 > 0 and l0 > 0:
            item = ((overflow_sum(l0, l1), r0), (l1, r1), h + 1)
            s.add(item)
        if l1 > 0 and r0 > 0:
            item = ((l0, overflow_sum(r0,l1)), (l1, r1), h + 1)
            s.add(item)
        if r1 > 0 and l0 > 0:
            item = ((overflow_sum(l0, r1), r0), (l1, r1), h + 1)        
            s.add(item)
        if r1 > 0 and r0 > 0:
            item = ((l0, overflow_sum(r0, r1)), (l1, r1), h + 1)        
            s.add(item)        

        for i in range(1, l1 + 1):
            l = l1 - i
            r = overflow_sum(r1, i)
            if r1 + i < 5:
                if (r, l) != (l1, r1):
                    item = ((l0, r0), (l, r), h + 1)
                    s.add(item)

        for i in range(1, r1 + 1):
            l = overflow_sum(l1, i)
            r = r1 - i
            if l1 + i < 5:
                if (r, l) != (l1, r1):
                    item = ((l0, r0), (l, r), h + 1)
                    s.add(item)
    for item in s:
        L.append(item)

    return L

#building the dictionary bottom up
# level = depth is the bottom
# level = 0 is the top
#this function should return a dictionary
#the key of the dictionary is state of player A, the state of player B and the level
# For example, a key looks like ((i, j), (k, l), level), where
#(i, j) is the state of player A, (k, l) is the state of the player B
#the value of the dictionary is the predetermined game result if both players make the right moves,
# and the best next move if the level is even, or the worst move if the level is odd
# note the best and the worst is measured in terms of player A
# For example, if the level is odd, and we choose a move that leads to the samllest value.
# But that is the best move for player B.

# the game result is with respective to player A
# -1 means the first player will lose
# 0 means it will be a tie
# 1 means the first player will win


def best_move_dp(depth):
    assert(depth % 2 == 0)
    d = {}
    # base cases
    for i in range(0, 5):
        for j in range(0, 5):
            for k in range(0, 5):
                for l in range(0, 5):                    
                    if i == 0 and j==0 and k == 0 and l == 0:
                        d[((i, j), (k, l), depth)] = (0, [])
                    elif i==0 and j==0:
                        d[((i, j), (k, l), depth)] = (-1, [])
                    elif k==0 and l==0:
                        d[((i, j), (k, l), depth)] = (1, [])
                    else:
                        d[((i, j), (k, l), depth)] = (0, [])
                        
    for h in range(depth -1, -1, -1):
        # fill in code below

        pass






    return d


# display the game state
def display(w):
    print("***********************")
    print("A:", w[0])
    print("B:", w[1])


def chopsticks_game(moves, index):
    depth = 2*moves
    d = best_move_dp(depth)    
    w = ((1, 1), (1, 1), 0)
    display(w)
    moves_left = moves
    turn = 0
    while w[0] != (0, 0 ) and w[1] != (0, 0) and w[2] < depth:
        # computer will use d[w] to decide its move
        if (turn + 1) % 2 == index:
            result, v = d[w]
            if (result == 1 and index == 1) or (result == -1 and index == 0): print("I will win.")
            else: print("I may not win.")
            w = v
            moves_left -= 1
        else:
            all_next_moves = next_moves(w)
            num = len(all_next_moves)
            print(moves_left + index, "moves left.")
            print("Choices:")
            for i in range(len(all_next_moves)):
                print(i, ':', all_next_moves[i][:2])
            while True:
                s = input("Your move:")
                while not s.isnumeric():
                    s = input("Your move:")
                choice = int(s)
                if choice >= 0 and choice < num:
                    break
            v = list(w)
            v = all_next_moves[choice]
            v = tuple(v)
            w = v
        display(w)
        turn = turn +1
    if w[0] != (0,0) and w[1] != (0,0) and w[2] == depth:
        print("It is a tie.")
    elif w[0] == (0, 0):
        print("B wins.")
    else:
        print("A wins.")

moves = 10
print("The chopsticks game.")
print("The game will end within", moves, "moves.")
answer = input("Do you want to go first?")
if answer in ["Y", "y", "Yes", "YES", "yes"]: 
    chopsticks_game(moves, 0)
else:
    chopsticks_game(moves, 1)
