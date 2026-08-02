# ReAct Pattern Implementation Guide

## Overview

This document explains the strict ReAct (Reason → Act → STOP → Observe) pattern implementation in `hive_api.py` that prevents LLM hallucination of tool execution results.

## The Problem

**Before:** LLMs would often "imagine" tool execution results by generating responses like:
```
I have successfully moved 5 files and created 2 folders. The operation completed without errors.
```

This happens because the model continues generating text after outputting a tool call JSON, essentially fabricating execution results it never actually received.

## The Solution

### 1. Strict System Prompt (`_build_system_prompt`)

The system prompt now explicitly:

- **Defines the ReAct cycle**: Reason → Act → STOP → Observe
- **Forbids hallucination**: Lists specific forbidden behaviors with examples
- **Enforces immediate stopping**: After outputting a tool call, generation MUST stop
- **Shows correct examples**: Clear examples of what TO do and what NOT to do
- **Uses emphatic language**: Multiple warnings using ⚠️ and ❌ symbols to emphasize critical rules

Key sections:
```
# ⚠️ CRITICAL: STRICT REACT EXECUTION PROTOCOL ⚠️

3. **STOP IMMEDIATELY**: After outputting the tool call JSON, you MUST STOP generating text.
   - DO NOT write 'I will now...'
   - DO NOT write 'This will help me...'
   - DO NOT describe what the tool will do
   - DO NOT imagine or fabricate tool results
```

### 2. Stop Sequences in LLM API Calls

All provider functions now include stop sequences:
```python
stop=["```\n\n", "```\n", "\n\n\n"]  # Physically cuts off generation
```

These sequences **physically terminate generation** as soon as the model finishes a code block, preventing it from continuing with hallucinated explanations.

### 3. Multi-Turn ReAct Loop (`_tool_use_loop`)

The redesigned loop implements strict ReAct behavior:

#### How It Works:

```
Iteration 1:
  User: "List all TypeScript files"
  → LLM outputs: ```json\n{"tool": "search_files", ...}\n```
  → STOP (physically cut by stop sequence)
  → Execute tool → get REAL results
  
Iteration 2:
  System: "Here are REAL results: [actual file list]"
  → LLM reads results
  → Either: call another tool OR provide final answer
  → If tool call: STOP and repeat
  → If final answer: return to user
```

#### Key Features:

1. **Conversation History Management**
   - Maintains full conversation context across iterations
   - Each tool call becomes part of the history
   - Tool results are injected as system/user messages

2. **Tool Execution**
   - Parses tool calls from response
   - Executes ALL detected tool calls
   - Collects real execution results
   - Returns results to LLM with clear formatting

3. **Iteration Control**
   - `max_iterations=10` prevents infinite loops
   - Each iteration logged for debugging
   - Clear stopping conditions (no tool calls = final answer)

4. **Error Handling**
   - Catches exceptions during LLM calls
   - Returns last valid response on error
   - Logs all errors for debugging

### 4. Enhanced LLM Provider Functions

All provider functions (`_call_groq`, `_call_openai`, `_call_anthropic`, `_call_nvidia`, `_call_google`) now support:

- **Flexible input**: Accepts both `ChatContextMessage` objects and raw dicts
- **Conversation continuation**: Can receive multi-turn conversation history
- **Optional objective**: Supports empty objective when continuing a conversation
- **Stop sequences**: Enforces physical cut-off after tool calls

Example signature:
```python
async def _call_openai(
    model: str, 
    objective: str,  # Can be empty string for continuation
    chat_history: list[ChatContextMessage] | list[dict[str, str]]  # Flexible input
) -> str:
```

## Architecture Flow

```
┌─────────────────────────────────────────────────┐
│ User sends request: "Move these 5 files"       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Initial LLM Call (Iteration 0)                  │
│ - Sends user request + system prompt            │
│ - Stop sequences active                         │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ LLM Response:                                   │
│ ```json                                         │
│ {"tool": "move_file", "arguments": {...}}      │
│ ```                                             │
│ [STOP - generation cut by stop sequence]       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Tool Execution (_dispatch_tool)                 │
│ - Parse JSON tool call                          │
│ - Execute _exec_move_file(args)                 │
│ - Collect REAL filesystem result                │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Observation Message Construction                │
│ "Tool Execution Results:                        │
│  === Tool Call 1: move_file ===                 │
│  Arguments: {...}                               │
│  Execution Result:                              │
│  Successfully moved 'src/old.ts' to 'src/new.ts'│
│                                                  │
│  Based on these REAL results, you can now:      │
│  1. Call another tool if needed                 │
│  2. Provide your final answer"                  │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Next LLM Call (Iteration 1)                     │
│ - Full conversation history included            │
│ - Tool results as user message                  │
│ - Stop sequences still active                   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ LLM Response (2 possibilities):                 │
│                                                  │
│ Option A: Another tool call                     │
│ ```json                                         │
│ {"tool": "read_file", "arguments": {...}}      │
│ ```                                             │
│ [STOP - loop continues]                         │
│                                                  │
│ Option B: Final answer                          │
│ "I've successfully moved the file from          │
│  src/old.ts to src/new.ts as requested."       │
│ [No tool call detected - loop exits]            │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Return final response to user                   │
└─────────────────────────────────────────────────┘
```

## Benefits

### 1. **Zero Hallucination of Tool Results**
- LLM physically cannot fabricate results (stop sequences enforce this)
- Always receives real execution output before continuing

### 2. **Multi-Step Tool Chaining**
- Can call multiple tools in sequence
- Each tool execution informs the next decision
- Natural workflow: search → read → edit → verify

### 3. **Full Context Preservation**
- Conversation history maintained across iterations
- Tool results become part of the narrative
- LLM can reference previous tool outputs

### 4. **Debugging & Observability**
- All iterations logged with `_log(agent_id, ...)`
- Tool execution results visible in logs
- Clear iteration count and status

### 5. **Safety & Control**
- Max iterations prevents infinite loops
- Error handling at each step
- Graceful degradation on failures

## Testing Recommendations

### Test Case 1: Single Tool Call
```
User: "How many files are in the src directory?"
Expected: 
  - Iteration 1: Call list_directory_tree
  - Iteration 2: Provide count from real results
```

### Test Case 2: Multi-Tool Chain
```
User: "Find all TODO comments in TypeScript files"
Expected:
  - Iteration 1: Call search_files for *.ts
  - Iteration 2: Call search_files with pattern="TODO" target="content"
  - Iteration 3: Synthesize list from results
```

### Test Case 3: No Tool Needed
```
User: "What is TypeScript?"
Expected:
  - Iteration 1: Direct answer (no tool call)
  - No loop iterations needed
```

### Test Case 4: Tool Error Handling
```
User: "Delete /nonexistent/file.txt"
Expected:
  - Iteration 1: Call delete_file
  - System returns error message
  - Iteration 2: LLM reports error to user accurately
```

## Configuration

### Adjustable Parameters

In `_tool_use_loop`:
```python
max_iterations: int = 10  # Maximum ReAct cycles before stopping
```

In each `_call_*` function:
```python
stop=["```\n\n", "```\n", "\n\n\n"]  # Sequences that terminate generation
```

### Provider-Specific Notes

- **OpenAI/Groq**: Native support for `stop` parameter
- **Anthropic**: Uses `stop_sequences` parameter
- **NVIDIA**: OpenAI-compatible, supports `stop`
- **Google Gemini**: No native stop sequence support (may need additional handling)

## Troubleshooting

### Issue: Model still hallucinating results

**Solution:**
1. Check if stop sequences are being passed correctly
2. Verify system prompt is being included in every call
3. Increase emphasis in system prompt (add more ❌ warnings)
4. Consider shorter `max_tokens` to limit generation length

### Issue: Loop never terminates

**Solution:**
1. Check `max_iterations` setting
2. Verify `_parse_tool_calls` correctly detects absence of tool calls
3. Review logs to see iteration progression
4. Check if LLM is outputting malformed JSON that keeps getting detected

### Issue: Tool results not reaching LLM

**Solution:**
1. Verify `conversation_history.append()` is working
2. Check that observation message is properly formatted
3. Ensure provider function correctly handles conversation history
4. Review logs to see message content at each iteration

## Future Enhancements

1. **Streaming Support**: Stream tool execution updates to frontend in real-time
2. **Parallel Tool Execution**: Execute multiple independent tools simultaneously
3. **Tool Result Caching**: Cache expensive tool results across iterations
4. **Dynamic Stop Sequences**: Adjust stop sequences based on model behavior
5. **Reasoning Traces**: Expose internal reasoning to users for transparency

## References

- **ReAct Paper**: [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- **Tool Use Best Practices**: Anthropic, OpenAI documentation on function calling
- **Stop Sequences**: OpenAI API documentation on generation control

---

**Last Updated**: 2026-08-02  
**Author**: Hive Development Team  
**Version**: 1.0
