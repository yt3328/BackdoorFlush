# Notes

The parser currently targets a narrow PokerStars-style text format. It is enough for the sample file and for shaping the API, but real uploads will be messier.

Things to watch:

- Currency symbols and tournament formats need separate parsing paths.
- Some sites include mucked cards, side pots, all-ins, rake, and uncalled bets differently.
- The current stats are session-level signals, not coaching advice.
- Equity calculation is Monte Carlo. Increase iterations for smoother numbers.
- Anything that touches real-money play should stay focused on study away from live hands.

