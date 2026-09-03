#!/usr/bin/env python3
"""
Test runner for Deep Research Agent v2.
"""

import sys
from pathlib import Path

# Add v2 directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Import test modules
from tests import test_utils, test_cache

def main():
    """Run all tests."""
    print("=" * 60)
    print("Deep Research Agent v2 - Test Suite")
    print("=" * 60)
    
    try:
        test_utils.run_all_tests()
        test_cache.run_all_tests()
        print("\n" + "=" * 60)
        print("✅ ALL TESTS PASSED")
        print("=" * 60)
        return 0
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    sys.exit(main())
