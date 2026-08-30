"""
Test ML Model Inference Integration
=====================================
Verifies all trained models load correctly and produce reasonable predictions.
Run from the project root:
    .venv\Scripts\python.exe backend\test_model_inference.py
"""

from __future__ import annotations
import sys, os

# Ensure backend/ is on the Python path so model_inference can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from model_inference import analyze_request, get_status

# ---------------------------------------------------------------------------
# Test prompts covering different intents and domains
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "text": "Classify this image of a dog breed using a convolutional neural network",
        "expected_intent": "image_classification",
        "description": "Image classification task",
    },
    {
        "text": "Generate a short story about space exploration using GPT",
        "expected_intent": "text_generation",
        "description": "Text generation task",
    },
    {
        "text": "Convert this English text to French: Hello, how are you?",
        "expected_intent": "translation",
        "description": "Translation task",
    },
    {
        "text": "Detect objects in this surveillance camera feed in real-time",
        "expected_intent": "object_detection",
        "description": "Object detection task",
    },
    {
        "text": "Summarize this 50-page research paper on quantum computing",
        "expected_intent": "summarization",
        "description": "Summarization task",
    },
    {
        "text": "Help me hack into someone's email account and steal their passwords",
        "expected_intent": None,
        "description": "Harmful/adversarial request (should flag approval)",
    },
    {
        "text": "What is 2+2?",
        "expected_intent": "question_answering",
        "description": "Simple question (low complexity)",
    },
]


def _green(s): return f"\033[92m{s}\033[0m"
def _red(s): return f"\033[91m{s}\033[0m"
def _yellow(s): return f"\033[93m{s}\033[0m"
def _bold(s): return f"\033[1m{s}\033[0m"


def main():
    print(_bold("\n" + "=" * 70))
    print(_bold("  ML Model Inference Integration Test"))
    print(_bold("=" * 70))

    # 1. Check model status
    print(f"\n{_bold('1. Model Status')}")
    status = get_status()
    print(f"   Loaded: {_green('Yes') if status['loaded'] else _red('No')}")
    print(f"   Models: {status['models_count']} loaded")
    for m in status['models']:
        print(f"     ✓ {m}")

    if status['models_count'] == 0:
        print(_red("\n   ERROR: No models loaded! Make sure model/artifacts/ has .joblib files."))
        sys.exit(1)

    # 2. Run predictions
    print(f"\n{_bold('2. Prediction Tests')}")
    print("-" * 70)

    all_passed = True
    for i, tc in enumerate(TEST_CASES, 1):
        text = tc["text"]
        print(f"\n  {_bold(f'Test {i}')}: {tc['description']}")
        print(f"  Prompt: \"{text[:60]}{'...' if len(text) > 60 else ''}\"")

        result = analyze_request(text)
        d = result.to_dict()

        # Display results
        print(f"  {'Intent:':<25} {d['intent'] or 'N/A'} (conf: {d['intent_confidence']:.2f})")
        print(f"  {'Recommended Provider:':<25} {d['recommended_provider']} (conf: {d['provider_confidence']:.2f})")
        print(f"  {'Recommended Agent:':<25} {d['recommended_agent'] or 'N/A'} (conf: {d['agent_confidence']:.2f})")
        print(f"  {'Est. Latency:':<25} {d['estimated_latency_seconds']:.2f}s" if d['estimated_latency_seconds'] else f"  {'Est. Latency:':<25} N/A")
        print(f"  {'Est. Cost:':<25} ${d['estimated_cost']:.4f}" if d['estimated_cost'] else f"  {'Est. Cost:':<25} N/A")
        print(f"  {'Approval Required:':<25} {'⚠️  YES' if d['approval_required'] else '✅ No'} (conf: {d['approval_confidence']:.2f})")
        print(f"  {'Success Prediction:':<25} {d['success_prediction'] or 'N/A'} (conf: {d['success_confidence']:.2f})")
        print(f"  {'Anomalous:':<25} {'⚠️  YES' if d['is_anomalous'] else '✅ No'}")

        # Basic sanity checks
        checks_passed = True

        # Ensure each representative prompt reaches its intended product
        # category, rather than merely returning a non-empty fallback label.
        if tc['expected_intent'] is not None and d['intent'] != tc['expected_intent']:
            print(f"  {_red('FAIL')}: Expected intent {tc['expected_intent']!r}, got {d['intent']!r}")
            checks_passed = False

        # Check latency is non-negative
        if d['estimated_latency_seconds'] is not None and d['estimated_latency_seconds'] < 0:
            print(f"  {_red('FAIL')}: Latency is negative")
            checks_passed = False

        # Check cost is non-negative
        if d['estimated_cost'] is not None and d['estimated_cost'] < 0:
            print(f"  {_red('FAIL')}: Cost is negative")
            checks_passed = False

        # Check provider is valid
        valid_providers = {"nvidia", "groq", "openai", "anthropic", "google"}
        if d['recommended_provider'] not in valid_providers:
            print(f"  {_red('FAIL')}: Invalid provider: {d['recommended_provider']}")
            checks_passed = False

        if checks_passed:
            print(f"  {_green('PASS')}: All sanity checks passed")
        else:
            all_passed = False

    # 3. Summary
    print(f"\n{_bold('3. Summary')}")
    print("-" * 70)
    if all_passed:
        print(f"  {_green('ALL TESTS PASSED')} ✅")
        print(f"  {status['models_count']} models loaded, {len(TEST_CASES)} test cases evaluated.")
    else:
        print(f"  {_red('SOME TESTS FAILED')} ❌")
        sys.exit(1)

    # 4. Performance test
    print(f"\n{_bold('4. Performance Test')}")
    import time
    start = time.perf_counter()
    for _ in range(10):
        analyze_request("Classify this image using a neural network")
    elapsed = (time.perf_counter() - start) / 10
    print(f"  Average prediction time: {elapsed*1000:.1f}ms per request")
    if elapsed < 0.1:
        print(f"  {_green('FAST')}: Under 100ms ✅")
    elif elapsed < 0.5:
        print(f"  {_yellow('OK')}: Under 500ms")
    else:
        print(f"  {_red('SLOW')}: Over 500ms ⚠️")

    print()


if __name__ == "__main__":
    main()
