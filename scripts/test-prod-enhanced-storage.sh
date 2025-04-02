#!/bin/bash

# Production API URL
API_URL="https://savie-server-production-3fc812ac12c5.herokuapp.com"

# You'll need to insert a valid JWT token here
AUTH_TOKEN="YOUR_JWT_TOKEN"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== Testing Enhanced Storage in Production ==="
echo ""

# Function to check if jq is installed
check_dependencies() {
  if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is not installed. Please install it using 'brew install jq' or similar.${NC}"
    exit 1
  fi
}

# Test the enhance endpoint with message_id
test_enhance_endpoint() {
  echo "Testing /api/ai/enhance endpoint with message_id..."
  
  # Sample text to enhance
  SAMPLE_TEXT="this is a test message that needs enhancement. it has some grammar errors."
  
  # First, create a test message to get a message_id
  echo "1. Creating a test message..."
  CREATE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"text_content":"'$SAMPLE_TEXT'"}' \
    "$API_URL/api/messages")
  
  # Extract message_id
  MESSAGE_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
  
  if [ "$MESSAGE_ID" == "null" ] || [ -z "$MESSAGE_ID" ]; then
    echo -e "${RED}Error: Failed to create test message.${NC}"
    echo "Response: $CREATE_RESPONSE"
    return 1
  fi
  
  echo "Created message with ID: $MESSAGE_ID"
  
  # Test enhance endpoint with message_id
  echo "2. Enhancing text with message_id..."
  ENHANCE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content":"'$SAMPLE_TEXT'", "message_id":"'$MESSAGE_ID'"}' \
    "$API_URL/api/ai/enhance")
  
  # Check if the response contains enhanced text
  ENHANCED_TEXT=$(echo $ENHANCE_RESPONSE | jq -r '.enhanced')
  
  if [ "$ENHANCED_TEXT" == "null" ] || [ -z "$ENHANCED_TEXT" ]; then
    echo -e "${RED}Error: Failed to enhance text.${NC}"
    echo "Response: $ENHANCE_RESPONSE"
    return 1
  fi
  
  echo "Text enhanced successfully."
  echo "Original: $SAMPLE_TEXT"
  echo "Enhanced: $ENHANCED_TEXT"
  
  # Verify storage by fetching the message
  echo "3. Verifying storage..."
  GET_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$API_URL/api/messages/$MESSAGE_ID")
  
  # Check if enhanced_text_content is present
  STORED_ENHANCED_TEXT=$(echo $GET_RESPONSE | jq -r '.enhanced_text_content')
  ENHANCED_FLAG=$(echo $GET_RESPONSE | jq -r '.enhanced_with_ai')
  
  if [ "$ENHANCED_FLAG" != "true" ]; then
    echo -e "${RED}Error: Message was not marked as enhanced.${NC}"
    echo "Response: $GET_RESPONSE"
    return 1
  fi
  
  if [ "$STORED_ENHANCED_TEXT" == "null" ] || [ -z "$STORED_ENHANCED_TEXT" ]; then
    echo -e "${RED}Error: Enhanced text was not stored.${NC}"
    echo "Response: $GET_RESPONSE"
    return 1
  fi
  
  echo -e "${GREEN}Success: Enhanced text stored successfully!${NC}"
  echo "Stored enhanced text: $STORED_ENHANCED_TEXT"
  return 0
}

# Test Quill Delta enhancement
test_delta_enhancement() {
  echo ""
  echo "Testing Quill Delta enhancement..."
  
  # Sample Delta JSON
  DELTA_JSON='{"ops":[{"insert":"Shopping List:","attributes":{"bold":true}},{"insert":"\n"},{"insert":"buy milk","attributes":{"list":"bullet"}},{"insert":"\n"},{"insert":"get eggs","attributes":{"list":"bullet"}},{"insert":"\n"}]}'
  
  # Create a test message with Delta content
  echo "1. Creating a test message with Delta content..."
  CREATE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"text_content":"Shopping List:\n- buy milk\n- get eggs", "delta_content":'"$DELTA_JSON"'}' \
    "$API_URL/api/messages")
  
  # Extract message_id
  MESSAGE_ID=$(echo $CREATE_RESPONSE | jq -r '.id')
  
  if [ "$MESSAGE_ID" == "null" ] || [ -z "$MESSAGE_ID" ]; then
    echo -e "${RED}Error: Failed to create test message with Delta.${NC}"
    echo "Response: $CREATE_RESPONSE"
    return 1
  fi
  
  echo "Created message with ID: $MESSAGE_ID"
  
  # Test enhance endpoint with Delta and message_id
  echo "2. Enhancing Delta content..."
  ENHANCE_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content":'"$DELTA_JSON"', "format":"delta", "message_id":"'$MESSAGE_ID'"}' \
    "$API_URL/api/ai/enhance")
  
  # Check if the response contains enhanced Delta
  ENHANCED_DELTA=$(echo $ENHANCE_RESPONSE | jq -r '.enhanced')
  
  if [ "$ENHANCED_DELTA" == "null" ]; then
    echo -e "${RED}Error: Failed to enhance Delta.${NC}"
    echo "Response: $ENHANCE_RESPONSE"
    return 1
  fi
  
  echo "Delta enhanced successfully."
  
  # Verify storage by fetching the message
  echo "3. Verifying Delta storage..."
  GET_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    "$API_URL/api/messages/$MESSAGE_ID")
  
  # Check if enhanced_delta_content is present
  ENHANCED_FLAG=$(echo $GET_RESPONSE | jq -r '.enhanced_with_ai')
  STORED_ENHANCED_DELTA=$(echo $GET_RESPONSE | jq -r '.enhanced_delta_content')
  
  if [ "$ENHANCED_FLAG" != "true" ]; then
    echo -e "${RED}Error: Delta message was not marked as enhanced.${NC}"
    return 1
  fi
  
  if [ "$STORED_ENHANCED_DELTA" == "null" ]; then
    echo -e "${RED}Error: Enhanced Delta was not stored.${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Success: Enhanced Delta stored successfully!${NC}"
  return 0
}

# Test transcription storage
test_transcription() {
  echo ""
  echo "Testing transcription storage..."
  echo "Note: This test requires an audio file. Skipping for now."
  echo "To test transcription manually:"
  echo "1. Create a message with voice attachment"
  echo "2. Use curl to upload the audio file to /api/ai/transcribe with message_id"
  echo "3. Check the voice_messages table for transcription_text"
  return 0
}

# Main test function
run_tests() {
  check_dependencies
  
  # Test enhance endpoint
  test_enhance_endpoint
  ENHANCE_RESULT=$?
  
  # Test Delta enhancement
  test_delta_enhancement
  DELTA_RESULT=$?
  
  # Test transcription (skipped in automated tests)
  test_transcription
  TRANSCRIPTION_RESULT=0
  
  # Print results
  echo ""
  echo "===== TEST RESULTS ====="
  
  if [ $ENHANCE_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Text Enhancement Test Passed${NC}"
  else
    echo -e "${RED}✗ Text Enhancement Test Failed${NC}"
  fi
  
  if [ $DELTA_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Delta Enhancement Test Passed${NC}"
  else
    echo -e "${RED}✗ Delta Enhancement Test Failed${NC}"
  fi
  
  if [ $TRANSCRIPTION_RESULT -eq 0 ]; then
    echo -e "${GREEN}✓ Transcription Test (Skipped)${NC}"
  else
    echo -e "${RED}✗ Transcription Test Failed${NC}"
  fi
  
  echo ""
  if [ $ENHANCE_RESULT -eq 0 ] && [ $DELTA_RESULT -eq 0 ] && [ $TRANSCRIPTION_RESULT -eq 0 ]; then
    echo -e "${GREEN}All tests passed! The implementation is working correctly.${NC}"
  else
    echo -e "${RED}Some tests failed. Please check the logs above.${NC}"
  fi
}

# Instructions before starting tests
echo "Before running this test, please:"
echo "1. Replace YOUR_JWT_TOKEN with a valid authentication token"
echo "2. Make sure jq is installed (brew install jq)"
echo ""
echo "Press Enter to continue or Ctrl+C to abort..."
read

# Run the tests
run_tests 