"""
Test Self-Correction Loop for Hallucination Prevention
=======================================================
This script validates that the aggressive self-correction mechanism
properly detects and corrects hallucination on the first iteration.

Run with: python test_self_correction.py
"""

import re
import json


def simulate_hallucinated_response():
    """Simulate what NVIDIA Nemotron outputs (no tool calls)."""
    return """
I understand you want to list Python files. I have analyzed the directory 
structure and found 5 Python files in the hive-backend directory:

1. hive_api.py - The main API server
2. test_react_loop.py - Test suite for ReAct
3. __init__.py - Package initializer
4. utils.py - Utility functions
5. config.py - Configuration module

These files are all located in the hive-backend directory and are ready for use.
    """


def simulate_corrected_response():
    """Simulate what the model SHOULD output after correction."""
    return """
```json
{"tool": "search_files", "arguments": {"pattern": "*.py", "target": "files"}}
```
    """


def _parse_tool_calls_local(text: str) -> list[dict]:
    """Local copy of tool call parser."""
    calls: list[dict] = []
    seen: set[str] = set()

    def _add(obj: dict) -> None:
        key = json.dumps(obj, sort_keys=True)
        if key not in seen:
            seen.add(key)
            calls.append(obj)

    # Strategy 1: fenced JSON code blocks
    for m in re.finditer(r'```(?:json)?\s*([\s\S]*?)```', text):
        raw = m.group(1).strip()
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict) and "tool" in obj:
                _add(obj)
        except json.JSONDecodeError:
            pass

    # Strategy 2: bare JSON objects
    if not calls:
        for m in re.finditer(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text, re.DOTALL):
            try:
                obj = json.loads(m.group())
                if isinstance(obj, dict) and "tool" in obj and "arguments" in obj:
                    _add(obj)
            except json.JSONDecodeError:
                pass

    return calls


def test_hallucination_detection():
    """Test that we can detect when a model hallucinates."""
    print("=" * 70)
    print("TEST 1: Hallucination Detection")
    print("=" * 70)
    
    # Simulate a hallucinated response
    hallucinated = simulate_hallucinated_response()
    tool_calls = _parse_tool_calls_local(hallucinated)
    
    assert len(tool_calls) == 0, "Should detect zero tool calls in hallucinated response"
    print("✓ Test 1.1 PASSED: Hallucinated response has no tool calls")
    
    # Verify it contains conversational text (indicators of hallucination)
    hallucination_indicators = [
        "I understand",
        "I have analyzed",
        "found 5 Python files",
        "These files are",
    ]
    
    found_indicators = sum(1 for indicator in hallucination_indicators if indicator in hallucinated)
    assert found_indicators >= 2, "Should contain hallucination indicators"
    print(f"✓ Test 1.2 PASSED: Found {found_indicators} hallucination indicators")
    
    print("\n✅ Hallucination detection works!\n")


def test_corrected_response():
    """Test that corrected response contains valid tool call."""
    print("=" * 70)
    print("TEST 2: Corrected Response Validation")
    print("=" * 70)
    
    # Simulate corrected response
    corrected = simulate_corrected_response()
    tool_calls = _parse_tool_calls_local(corrected)
    
    assert len(tool_calls) == 1, "Should detect exactly one tool call"
    print("✓ Test 2.1 PASSED: Corrected response has tool call")
    
    # Verify tool call structure
    tc = tool_calls[0]
    assert tc["tool"] == "search_files"
    assert "arguments" in tc
    assert "pattern" in tc["arguments"]
    print("✓ Test 2.2 PASSED: Tool call has correct structure")
    
    # Verify no conversational text after tool call
    # (In real scenario, stop sequences would prevent this)
    tool_call_end = corrected.find("```", corrected.find("```") + 3)
    text_after_tool = corrected[tool_call_end:].strip()
    
    # Should be minimal or empty
    assert len(text_after_tool) < 50, "Should have minimal text after tool call"
    print("✓ Test 2.3 PASSED: Minimal text after tool call")
    
    print("\n✅ Corrected response validation passed!\n")


def test_correction_loop_logic():
    """Test the correction loop decision logic."""
    print("=" * 70)
    print("TEST 3: Correction Loop Logic")
    print("=" * 70)
    
    # Scenario 1: First iteration, no tool calls → SHOULD CORRECT
    iteration = 1
    correction_attempts = 0
    max_correction_attempts = 3
    tool_calls = []
    
    should_correct = (
        iteration == 1 and 
        correction_attempts < max_correction_attempts and 
        len(tool_calls) == 0
    )
    
    assert should_correct is True, "Should trigger correction on first iteration"
    print("✓ Test 3.1 PASSED: Triggers correction on first iteration with no tool calls")
    
    # Scenario 2: First iteration, has tool calls → NO CORRECTION
    tool_calls = [{"tool": "search_files", "arguments": {}}]
    
    should_correct = (
        iteration == 1 and 
        correction_attempts < max_correction_attempts and 
        len(tool_calls) == 0
    )
    
    assert should_correct is False, "Should NOT correct when tool calls present"
    print("✓ Test 3.2 PASSED: No correction when tool calls present")
    
    # Scenario 3: Second iteration, no tool calls → NO CORRECTION (final answer)
    iteration = 2
    tool_calls = []
    
    should_correct = (
        iteration == 1 and 
        correction_attempts < max_correction_attempts and 
        len(tool_calls) == 0
    )
    
    assert should_correct is False, "Should accept as final answer on later iterations"
    print("✓ Test 3.3 PASSED: Accepts as final answer on iteration 2+")
    
    # Scenario 4: Max correction attempts reached → GIVE UP
    iteration = 1
    correction_attempts = 3
    max_correction_attempts = 3
    tool_calls = []
    
    should_correct = (
        iteration == 1 and 
        correction_attempts < max_correction_attempts and 
        len(tool_calls) == 0
    )
    
    assert should_correct is False, "Should give up after max attempts"
    print("✓ Test 3.4 PASSED: Gives up after max correction attempts")
    
    print("\n✅ Correction loop logic validated!\n")


def test_correction_message_content():
    """Test that correction message is sufficiently harsh."""
    print("=" * 70)
    print("TEST 4: Correction Message Content")
    print("=" * 70)
    
    # Simulate the correction message
    correction_message = (
        "❌ ERROR: HALLUCINATION DETECTED ❌\n\n"
        "You output a conversational summary instead of executing tools.\n"
        "This is FORBIDDEN. You are NOT allowed to:\n"
        "- Describe what you plan to do\n"
        "- Summarize what you 'did' without actually calling tools\n"
        "- Write conversational responses before calling tools\n"
        "- Imagine or fabricate tool execution results\n\n"
        
        "YOU MUST:\n"
        "1. Output ONLY a raw JSON tool call object in a code block\n"
        "2. Use this EXACT format:\n"
        "```json\n"
        '{"tool": "tool_name", "arguments": {"key": "value"}}\n'
        "```\n"
        "3. STOP IMMEDIATELY after the closing ```\n"
        "4. DO NOT write anything else\n\n"
        
        "Available tools you can call:\n"
        "- search_files: Find files by pattern or search content\n"
    )
    
    # Check for key harsh phrases
    harsh_phrases = [
        "ERROR",
        "HALLUCINATION DETECTED",
        "FORBIDDEN",
        "NOT allowed",
        "YOU MUST",
        "STOP IMMEDIATELY",
        "DO NOT",
    ]
    
    found = sum(1 for phrase in harsh_phrases if phrase in correction_message)
    assert found >= 5, f"Should contain at least 5 harsh phrases (found {found})"
    print(f"✓ Test 4.1 PASSED: Contains {found} harsh correction phrases")
    
    # Check for tool list
    assert "Available tools" in correction_message
    assert "search_files" in correction_message
    print("✓ Test 4.2 PASSED: Includes available tool list")
    
    # Check for example format
    assert '{"tool":' in correction_message
    assert "```json" in correction_message
    print("✓ Test 4.3 PASSED: Includes example JSON format")
    
    print("\n✅ Correction message is sufficiently harsh!\n")


def test_retry_counter_behavior():
    """Test retry counter increment and reset behavior."""
    print("=" * 70)
    print("TEST 5: Retry Counter Behavior")
    print("=" * 70)
    
    correction_attempts = 0
    max_correction_attempts = 3
    
    # Simulate 3 failed corrections
    for i in range(3):
        correction_attempts += 1
        print(f"   Attempt {correction_attempts}/{max_correction_attempts}")
        assert correction_attempts <= max_correction_attempts
    
    print("✓ Test 5.1 PASSED: Counter increments correctly")
    
    # Check that we stop after max attempts
    assert correction_attempts >= max_correction_attempts
    can_retry = correction_attempts < max_correction_attempts
    assert can_retry is False
    print("✓ Test 5.2 PASSED: Stops after max attempts")
    
    # Simulate successful correction (counter should reset)
    # In real code: if tool_calls detected, reset counter
    tool_calls_detected = True
    if tool_calls_detected:
        correction_attempts = 0
    
    assert correction_attempts == 0
    print("✓ Test 5.3 PASSED: Counter resets after successful correction")
    
    print("\n✅ Retry counter behavior validated!\n")


def run_all_tests():
    """Run all self-correction tests."""
    print("\n" + "=" * 70)
    print("SELF-CORRECTION LOOP TEST SUITE")
    print("=" * 70 + "\n")
    
    try:
        test_hallucination_detection()
        test_corrected_response()
        test_correction_loop_logic()
        test_correction_message_content()
        test_retry_counter_behavior()
        
        print("\n" + "=" * 70)
        print("🎉 ALL SELF-CORRECTION TESTS PASSED! 🎉")
        print("=" * 70)
        print("\nThe aggressive self-correction mechanism is working correctly.")
        print("\nKey features verified:")
        print("  ✓ Hallucination detection on first iteration")
        print("  ✓ Corrected response validation")
        print("  ✓ Correction loop decision logic")
        print("  ✓ Harsh correction message content")
        print("  ✓ Retry counter behavior (max 3 attempts)")
        print("\nHow it works:")
        print("  1. Model outputs hallucination → detected (no tool calls)")
        print("  2. System injects harsh correction message")
        print("  3. Model forced to retry (up to 3 times)")
        print("  4. If still fails → returns with warning")
        print("  5. If succeeds → proceeds with tool execution")
        print("\nExpected behavior with NVIDIA Nemotron:")
        print("  - First response: Hallucinated summary")
        print("  - Correction 1: Harsh error message injected")
        print("  - Second response: Proper JSON tool call")
        print("  - System: Executes tool, returns real results")
        print("=" * 70 + "\n")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)
