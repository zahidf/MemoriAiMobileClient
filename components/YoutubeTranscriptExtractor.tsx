import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

interface YouTubeTranscriptExtractorProps {
  onTranscriptExtracted: (transcript: string, videoTitle: string) => void;
  onCancel: () => void;
}

export default function YouTubeTranscriptExtractor({
  onTranscriptExtracted,
  onCancel,
}: YouTubeTranscriptExtractorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const webViewRef = useRef<WebView>(null);

  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("https://youtube.com");
  const [extracting, setExtracting] = useState(false);
  const [canExtract, setCanExtract] = useState(false);
  const [videoId, setVideoId] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualTranscript, setManualTranscript] = useState("");

  const injectedJavaScript = `
    (function() {
      function sendMessage(data) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
        } catch (e) {
          console.error('Send message failed:', e);
        }
      }
      
      function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || '';
      }
      
      function getVideoTitle() {
        const selectors = [
          'h1.ytd-video-primary-info-renderer yt-formatted-string',
          'h1 yt-formatted-string',
          '#title h1',
          'h1.title',
          'meta[property="og:title"]'
        ];
        
        for (let i = 0; i < selectors.length; i++) {
          const element = document.querySelector(selectors[i]);
          if (element) {
            const text = element.textContent || element.getAttribute('content');
            if (text && text.trim()) {
              return text.trim();
            }
          }
        }
        
        return document.title.replace(' - YouTube', '') || 'YouTube Video';
      }
      
      function checkPage() {
        const videoId = getVideoId();
        const isVideoPage = window.location.pathname === '/watch' && videoId;
        
        sendMessage({
          type: 'page_info',
          url: window.location.href,
          isVideoPage: isVideoPage,
          videoId: videoId,
          title: getVideoTitle()
        });
      }
      
      function findTranscriptButton() {
        // Look for transcript button more comprehensively
        const buttons = document.querySelectorAll('button, [role="button"]');
        for (let i = 0; i < buttons.length; i++) {
          const button = buttons[i];
          const ariaLabel = button.getAttribute('aria-label') || '';
          const text = button.textContent || '';
          
          if (ariaLabel.toLowerCase().includes('transcript') || 
              ariaLabel.toLowerCase().includes('show transcript') ||
              text.toLowerCase().includes('transcript')) {
            return button;
          }
        }
        
        // Try menu buttons
        const menuButtons = document.querySelectorAll('#menu-button button, [aria-label*="More" i]');
        return menuButtons.length > 0 ? menuButtons[0] : null;
      }
      
      function extractExistingTranscript() {
        let transcript = '';
        let foundElements = 0;
        
        // Method 1: Look for transcript segments
        const segmentSelectors = [
          '.ytd-transcript-segment-renderer',
          '[data-seq]',
          '.segment-text',
          '.cue-group-start-offset',
          'ytd-transcript-segment-renderer .segment-text'
        ];
        
        for (let i = 0; i < segmentSelectors.length; i++) {
          const segments = document.querySelectorAll(segmentSelectors[i]);
          foundElements += segments.length;
          
          for (let j = 0; j < segments.length; j++) {
            const segment = segments[j];
            const textElement = segment.querySelector('.segment-text') || segment;
            const text = textElement.textContent || textElement.innerText || '';
            
            if (text && text.trim() && text.length > 2) {
              // Skip timestamps (patterns like 0:00, 1:23, etc.)
              if (!text.match(/^\\d+:\\d+/) && !text.match(/^\\d+$/)) {
                transcript += text.trim() + ' ';
              }
            }
          }
          
          if (transcript.length > 100) break;
        }
        
        // Method 2: Look in transcript containers
        const containerSelectors = [
          '#segments-container',
          '.ytd-transcript-segment-list-renderer',
          '[target-id="engagement-panel-searchable-transcript"]',
          '.engagement-panel-content-section-renderer',
          '#structured-description'
        ];
        
        if (transcript.length < 100) {
          for (let i = 0; i < containerSelectors.length; i++) {
            const container = document.querySelector(containerSelectors[i]);
            if (container) {
              foundElements++;
              const allText = container.textContent || container.innerText || '';
              
              // Clean up the text
              const lines = allText.split('\\n');
              for (let j = 0; j < lines.length; j++) {
                const line = lines[j].trim();
                if (line && line.length > 3 && !line.match(/^\\d+:\\d+/) && !line.match(/^\\d+$/)) {
                  transcript += line + ' ';
                }
              }
              
              if (transcript.length > 100) break;
            }
          }
        }
        
        sendMessage({
          type: 'debug_info',
          message: \`Found \${foundElements} elements, transcript length: \${transcript.length}\`
        });
        
        return transcript.trim();
      }
      
      function clickAndWait(element, callback, delay = 2000) {
        if (element && typeof element.click === 'function') {
          element.click();
          setTimeout(callback, delay);
        } else {
          callback();
        }
      }
      
      function tryExtraction() {
        const videoId = getVideoId();
        if (!videoId) {
          sendMessage({ type: 'no_video_id' });
          return;
        }
        
        sendMessage({ type: 'extraction_started' });
        
        // Step 1: Check if transcript is already visible
        const existingTranscript = extractExistingTranscript();
        if (existingTranscript && existingTranscript.length > 50) {
          sendMessage({
            type: 'transcript_found',
            transcript: existingTranscript,
            title: getVideoTitle(),
            method: 'existing'
          });
          return;
        }
        
        // Step 2: Try to find and click transcript button
        const transcriptButton = findTranscriptButton();
        if (transcriptButton) {
          sendMessage({
            type: 'debug_info',
            message: \`Found button: \${transcriptButton.getAttribute('aria-label') || transcriptButton.textContent || 'unknown'}\`
          });
          
          clickAndWait(transcriptButton, function() {
            // Check again after clicking
            const newTranscript = extractExistingTranscript();
            if (newTranscript && newTranscript.length > 50) {
              sendMessage({
                type: 'transcript_found',
                transcript: newTranscript,
                title: getVideoTitle(),
                method: 'after_click'
              });
            } else {
              // Try clicking menu items
              const menuItems = document.querySelectorAll('[role="menuitem"]');
              let transcriptMenuItem = null;
              
              for (let i = 0; i < menuItems.length; i++) {
                const item = menuItems[i];
                const text = item.textContent || '';
                if (text.toLowerCase().includes('transcript')) {
                  transcriptMenuItem = item;
                  break;
                }
              }
              
              if (transcriptMenuItem) {
                clickAndWait(transcriptMenuItem, function() {
                  const finalTranscript = extractExistingTranscript();
                  if (finalTranscript && finalTranscript.length > 50) {
                    sendMessage({
                      type: 'transcript_found',
                      transcript: finalTranscript,
                      title: getVideoTitle(),
                      method: 'menu_click'
                    });
                  } else {
                    sendMessage({ type: 'no_transcript' });
                  }
                }, 3000); // Longer delay for menu interactions
              } else {
                sendMessage({ type: 'no_transcript' });
              }
            }
          });
        } else {
          sendMessage({
            type: 'debug_info',
            message: 'No transcript button found'
          });
          sendMessage({ type: 'no_transcript' });
        }
      }
      
      // Monitor URL changes
      let currentUrl = location.href;
      const urlCheckInterval = setInterval(function() {
        if (location.href !== currentUrl) {
          currentUrl = location.href;
          setTimeout(checkPage, 500);
        }
      }, 1000);
      
      // Initial check
      setTimeout(checkPage, 1000);
      
      // Make extraction function global
      window.startExtraction = tryExtraction;
      
      // Cleanup function
      window.cleanup = function() {
        clearInterval(urlCheckInterval);
      };
      
      sendMessage({ type: 'script_ready' });
      return true;
    })();
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case "script_ready":
          console.log("Script loaded successfully");
          break;

        case "page_info":
          setCurrentUrl(data.url);
          setCanExtract(data.isVideoPage);
          setVideoId(data.videoId || "");
          break;

        case "extraction_started":
          console.log("Extraction started");
          setDebugInfo("Starting extraction...");
          break;

        case "debug_info":
          console.log("Debug:", data.message);
          setDebugInfo(data.message);
          break;

        case "transcript_found":
          setExtracting(false);
          console.log("Transcript found via:", data.method);
          console.log("Transcript length:", data.transcript.length);

          if (data.transcript && data.transcript.length > 20) {
            onTranscriptExtracted(
              data.transcript,
              data.title || "YouTube Video"
            );
          } else {
            Alert.alert(
              "Transcript Too Short",
              "The transcript is too short to create flashcards."
            );
          }
          break;

        case "no_video_id":
          setExtracting(false);
          Alert.alert(
            "Error",
            "Could not find video ID. Make sure you're on a YouTube video page."
          );
          break;

        case "no_transcript":
          setExtracting(false);
          Alert.alert(
            "No Transcript Found",
            "Could not find a transcript for this video. This might be because:\n\n• The video doesn't have captions\n• Captions are not enabled\n• The page hasn't fully loaded",
            [
              { text: "Try Manual", onPress: () => setShowManualInput(true) },
              { text: "Cancel", style: "cancel" },
            ]
          );
          break;

        case "debug_test":
          console.log("Test transcript length:", data.length);
          console.log(
            "Test transcript preview:",
            data.transcript.slice(0, 200)
          );
          setDebugInfo("Test found " + data.length + " characters");
          Alert.alert(
            "Test Results",
            "Found " +
              data.length +
              " characters of transcript.\n\nPreview: " +
              data.transcript.slice(0, 100) +
              "..."
          );
          break;

        case "test_error":
          console.log("Test error:", data.error);
          Alert.alert("Test Error", data.error);
          break;

        case "function_not_found":
          setExtracting(false);
          Alert.alert(
            "Error",
            "Extraction function not found. Please refresh the page."
          );
          break;

        case "execution_error":
          setExtracting(false);
          console.error("Execution error:", data.error);
          Alert.alert(
            "Extraction Error",
            "An error occurred during extraction: " + data.error
          );
          break;

        default:
          console.log("Unknown message type:", data.type);
      }
    } catch (error) {
      console.error("Message parsing error:", error);
      setExtracting(false);
    }
  };

  const extractTranscript = () => {
    if (!canExtract) {
      Alert.alert(
        "Not a Video Page",
        "Please navigate to a YouTube video page first. Look for videos with the CC (closed captions) button."
      );
      return;
    }

    if (!videoId) {
      Alert.alert(
        "Error",
        "No video ID found. Please try refreshing the page."
      );
      return;
    }

    setExtracting(true);
    setDebugInfo("");

    // Direct JavaScript execution
    const jsCode = `
      (function() {
        try {
          if (window.startExtraction) {
            window.startExtraction();
          } else {
            window.ReactNativeWebView.postMessage(JSON.stringify({type: 'function_not_found'}));
          }
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type: 'execution_error', error: e.message}));
        }
        return true;
      })();
    `;

    webViewRef.current?.injectJavaScript(jsCode);

    // Fallback timeout
    setTimeout(() => {
      if (extracting) {
        setExtracting(false);
        Alert.alert(
          "Extraction Timeout",
          "The extraction took too long. This video might not have captions available.\n\nTry:\n• Manually enabling captions (CC button)\n• Waiting for the page to fully load\n• Using the manual input option"
        );
      }
    }, 25000); // Increased timeout
  };

  const handleManualSubmit = () => {
    if (manualTranscript.trim().length < 50) {
      Alert.alert(
        "Error",
        "Please enter at least 50 characters of transcript text."
      );
      return;
    }

    const videoTitle = `YouTube Video (${videoId})`;
    onTranscriptExtracted(manualTranscript.trim(), videoTitle);
    setShowManualInput(false);
    setManualTranscript("");
  };

  const testExistingTranscript = () => {
    setExtracting(true);
    const jsCode = `
      (function() {
        try {
          // Re-define the function inline for testing
          function extractExistingTranscript() {
            let transcript = '';
            let foundElements = 0;
            
            const segmentSelectors = [
              '.ytd-transcript-segment-renderer',
              '[data-seq]',
              '.segment-text',
              '.cue-group-start-offset'
            ];
            
            for (let i = 0; i < segmentSelectors.length; i++) {
              const segments = document.querySelectorAll(segmentSelectors[i]);
              foundElements += segments.length;
              
              for (let j = 0; j < segments.length; j++) {
                const segment = segments[j];
                const textElement = segment.querySelector('.segment-text') || segment;
                const text = textElement.textContent || textElement.innerText || '';
                
                if (text && text.trim() && text.length > 2) {
                  if (!text.match(/^\\d+:\\d+/) && !text.match(/^\\d+$/)) {
                    transcript += text.trim() + ' ';
                  }
                }
              }
              
              if (transcript.length > 100) break;
            }
            
            return transcript.trim();
          }
          
          const transcript = extractExistingTranscript();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'debug_test',
            transcript: transcript,
            length: transcript.length
          }));
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'test_error',
            error: e.message
          }));
        }
        return true;
      })();
    `;
    webViewRef.current?.injectJavaScript(jsCode);
    setExtracting(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <IconSymbol name="xmark" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            YouTube Transcript
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text + "70" }]}>
            Enable CC first, then extract
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.extractButton,
            {
              backgroundColor: canExtract ? colors.tint : colors.text + "20",
              opacity: extracting ? 0.7 : 1,
            },
          ]}
          onPress={extractTranscript}
          disabled={!canExtract || extracting}
        >
          {extracting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <IconSymbol name="doc.text.fill" size={16} color="white" />
              <Text style={styles.extractButtonText}>Extract</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={[styles.statusBar, { backgroundColor: colors.background }]}>
        <View style={styles.statusContent}>
          <IconSymbol
            name={canExtract ? "play.fill" : "magnifyingglass"}
            size={16}
            color={canExtract ? colors.tint : colors.text + "60"}
          />
          <Text style={[styles.statusText, { color: colors.text + "80" }]}>
            {canExtract ? `Video: ${videoId}` : "Navigate to a video"}
          </Text>
        </View>

        {canExtract && __DEV__ && (
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: colors.tint + "20" }]}
            onPress={testExistingTranscript}
          >
            <Text style={[styles.testButtonText, { color: colors.tint }]}>
              Test
            </Text>
          </TouchableOpacity>
        )}

        {extracting && (
          <View style={styles.extractingIndicator}>
            <ActivityIndicator size="small" color={colors.tint} />
            <Text style={[styles.extractingText, { color: colors.tint }]}>
              Extracting...
            </Text>
          </View>
        )}
      </View>

      <WebView
        ref={webViewRef}
        source={{ uri: "https://youtube.com" }}
        style={styles.webView}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onMessage={handleMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        allowsBackForwardNavigationGestures={true}
        onNavigationStateChange={(navState) => {
          setCurrentUrl(navState.url);
        }}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading YouTube...
          </Text>
        </View>
      )}

      {!loading && (
        <View
          style={[styles.instructions, { backgroundColor: colors.background }]}
        >
          <View style={styles.instructionContent}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.tint} />
            <View style={styles.instructionTextContainer}>
              <Text style={[styles.instructionsText, { color: colors.text }]}>
                {canExtract
                  ? "1. Click CC button in video player to enable captions\n2. Then click Extract above"
                  : "Find a video with captions (CC button visible)"}
              </Text>

              {debugInfo && (
                <Text style={[styles.debugText, { color: colors.text + "60" }]}>
                  Debug: {debugInfo}
                </Text>
              )}
            </View>
          </View>

          {canExtract && (
            <Text style={[styles.videoIdText, { color: colors.text + "60" }]}>
              Video ID: {videoId}
            </Text>
          )}
        </View>
      )}

      {/* Manual Input Modal */}
      <Modal visible={showManualInput} animationType="slide">
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View
            style={[styles.modalHeader, { backgroundColor: colors.background }]}
          >
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowManualInput(false);
                setManualTranscript("");
              }}
            >
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.modalHeaderContent}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Manual Transcript
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: colors.text + "70" }]}
              >
                Copy and paste the transcript manually
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.modalSubmitButton,
                {
                  backgroundColor:
                    manualTranscript.trim().length > 50
                      ? colors.tint
                      : colors.text + "20",
                },
              ]}
              onPress={handleManualSubmit}
              disabled={manualTranscript.trim().length < 50}
            >
              <Text style={styles.modalSubmitText}>Use This</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View
              style={[
                styles.instructionCard,
                { backgroundColor: colors.tint + "10" },
              ]}
            >
              <IconSymbol
                name="info.circle.fill"
                size={20}
                color={colors.tint}
              />
              <View style={styles.instructionCardText}>
                <Text style={[styles.instructionTitle, { color: colors.text }]}>
                  How to get transcript manually:
                </Text>
                <Text
                  style={[
                    styles.instructionSteps,
                    { color: colors.text + "80" },
                  ]}
                >
                  1. Click the CC button in the video player{"\n"}
                  2. Click the transcript button (usually three dots → Show
                  transcript){"\n"}
                  3. Copy all the transcript text{"\n"}
                  4. Paste it below
                </Text>
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Transcript Text
            </Text>
            <TextInput
              style={[
                styles.transcriptInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.text + "20",
                  color: colors.text,
                },
              ]}
              placeholder="Paste the transcript text here..."
              placeholderTextColor={colors.text + "50"}
              value={manualTranscript}
              onChangeText={setManualTranscript}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
            />

            <Text
              style={[styles.characterCount, { color: colors.text + "60" }]}
            >
              {manualTranscript.length} characters (minimum 50 required)
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  cancelButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  extractButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  extractButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statusText: {
    fontSize: 12,
    flex: 1,
  },
  testButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
  },
  testButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  extractingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  extractingText: {
    fontSize: 12,
    fontWeight: "500",
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  instructions: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  instructionContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  debugText: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: "monospace",
  },
  videoIdText: {
    fontSize: 10,
    marginTop: 8,
    fontFamily: "monospace",
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalHeaderContent: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalSubmitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  modalSubmitText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  instructionCard: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "flex-start",
    gap: 12,
  },
  instructionCardText: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  instructionSteps: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  transcriptInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 22,
    minHeight: 200,
  },
  characterCount: {
    fontSize: 12,
    marginTop: 8,
    textAlign: "right",
  },
});
