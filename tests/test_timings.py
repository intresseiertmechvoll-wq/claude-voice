"""Regression tests for provider timing conversion."""

import unittest

import claude_voice as cv


class ElevenLabsTimingTests(unittest.TestCase):
    def test_alignment_starting_with_whitespace_does_not_use_unbound_state(self):
        alignment = {
            "characters": [" ", "h", "i"],
            "character_start_times_seconds": [0.0, 0.1, 0.2],
            "character_end_times_seconds": [0.1, 0.2, 0.3],
        }

        self.assertEqual(cv._eleven_word_timings(alignment), [(0.1, 0.3)])

    def test_alignment_splits_words_on_whitespace(self):
        alignment = {
            "characters": ["h", "i", " ", "o", "k"],
            "character_start_times_seconds": [0.0, 0.1, 0.2, 0.3, 0.4],
            "character_end_times_seconds": [0.1, 0.2, 0.3, 0.4, 0.5],
        }

        self.assertEqual(cv._eleven_word_timings(alignment), [(0.0, 0.2), (0.3, 0.5)])


if __name__ == "__main__":
    unittest.main()
