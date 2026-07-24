# Notes

The parser currently targets a PokerStars-style text format. It handles common cash-game lines and currency-prefixed amounts, but real uploads will still be messier.

Things to watch:

- Currency symbols and tournament formats need separate parsing paths.
- Some sites include mucked cards, side pots, all-ins, rake, and uncalled bets differently.
- The current stats are session-level signals, not coaching advice.
- Equity calculation is Monte Carlo. Increase iterations for smoother numbers.
- Duplicate protection uses raw upload hashes and parsed hand keys. That is useful locally, but a multi-user version should scope those keys by user.
- Anything that touches real-money play should stay focused on study away from live hands.
