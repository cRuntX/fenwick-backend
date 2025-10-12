/**
 * Tests for compressRibaStages helper function
 * Run with: node compressRibaStages.test.js
 */

/**
 * Compresses an array of RIBA stage numbers into a formatted string
 * @param {number[]} nums - Array of stage numbers (0-7)
 * @returns {string | null} - Formatted string like "Stages 0–3, 5" or null if empty
 */
function compressRibaStages(nums) {
  if (!nums || nums.length === 0) return null;
  
  // Filter valid stages (0-7), sort, and remove duplicates
  const sorted = [...new Set(nums.filter(n => n >= 0 && n <= 7))].sort((a, b) => a - b);
  
  if (sorted.length === 0) return null;
  
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];
  
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      // Continue the range
      end = sorted[i];
    } else {
      // End of range, add it
      if (start === end) {
        ranges.push(`${start}`);
      } else {
        ranges.push(`${start}–${end}`);
      }
      if (i < sorted.length) {
        start = sorted[i];
        end = sorted[i];
      }
    }
  }
  
  const prefix = sorted.length === 1 ? "Stage " : "Stages ";
  return prefix + ranges.join(", ");
}

// Test cases
const tests = [
  {
    name: "Empty array",
    input: [],
    expected: null
  },
  {
    name: "Single stage",
    input: [5],
    expected: "Stage 5"
  },
  {
    name: "Consecutive stages (0-3)",
    input: [0, 1, 2, 3],
    expected: "Stages 0–3"
  },
  {
    name: "Multiple ranges (0-1, 3-4)",
    input: [0, 1, 3, 4],
    expected: "Stages 0–1, 3–4"
  },
  {
    name: "Non-consecutive stages",
    input: [2, 4],
    expected: "Stages 2, 4"
  },
  {
    name: "Full range (0-7)",
    input: [0, 1, 2, 3, 4, 5, 6, 7],
    expected: "Stages 0–7"
  },
  {
    name: "Unsorted with duplicates",
    input: [3, 2, 2, 4],
    expected: "Stages 2–4"
  },
  {
    name: "Complex pattern",
    input: [0, 2, 3, 4, 6, 7],
    expected: "Stages 0, 2–4, 6–7"
  },
  {
    name: "Out of range values ignored",
    input: [-1, 2, 3, 8, 9],
    expected: "Stages 2–3"
  },
  {
    name: "Only out of range values",
    input: [-1, 8, 9, 10],
    expected: null
  },
  {
    name: "Single stage with duplicates",
    input: [5, 5, 5],
    expected: "Stage 5"
  },
  {
    name: "All stages unsorted",
    input: [7, 6, 5, 4, 3, 2, 1, 0],
    expected: "Stages 0–7"
  },
  {
    name: "Two separate singles",
    input: [1, 5],
    expected: "Stages 1, 5"
  },
  {
    name: "Range and single",
    input: [0, 1, 2, 5],
    expected: "Stages 0–2, 5"
  },
  {
    name: "Single and range",
    input: [1, 4, 5, 6],
    expected: "Stages 1, 4–6"
  },
  {
    name: "Null input",
    input: null,
    expected: null
  },
  {
    name: "Undefined input",
    input: undefined,
    expected: null
  }
];

// Run tests
let passed = 0;
let failed = 0;

console.log('🧪 Running compressRibaStages tests...\n');

tests.forEach((test, index) => {
  const result = compressRibaStages(test.input);
  const success = result === test.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${test.name}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${test.name}`);
    console.log(`   Input: ${JSON.stringify(test.input)}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got: ${result}`);
  }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

if (failed === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}