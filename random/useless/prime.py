def prime_factors(n):
    factors = []
    i = 2
    while i * i <= n:
        while n % i == 0:
            factors.append(i)
            n //= i
        i += 1
    if n > 1:
        factors.append(n)
    return factors

for _ in iter(int, 1):  # infinite loop
    num = int(input("Enter number: "))
    print(prime_factors(num))
