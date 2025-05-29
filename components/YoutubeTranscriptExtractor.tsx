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

  const [showInstructions, setShowInstructions] = useState(true);

  const injectedJavaScript = `
    (function() {
      // Utility functions
      function sendMessage(data) {
        try {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
        } catch (e) {
          console.error('Send message failed:', e);
        }
      }
      
      function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
          const startTime = Date.now();
          
          const checkInterval = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
              clearInterval(checkInterval);
              resolve(element);
            }
            
            if (Date.now() - startTime > timeout) {
              clearInterval(checkInterval);
              reject(new Error('Element not found: ' + selector));
            }
          }, 100);
          hideInstructionsButton: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  hideInstructionsText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
      }
      
      function getVideoId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('v') || '';
      }
      
      function getVideoTitle() {
        const selectors = [
          'h1.ytd-video-primary-info-renderer yt-formatted-string',
          'h1 yt-formatted-string.ytd-watch-metadata',
          '#title h1 yt-formatted-string',
          'h1.title.style-scope.ytd-video-primary-info-renderer',
          'meta[property="og:title"]'
        ];
        
        for (let selector of selectors) {
          const element = document.querySelector(selector);
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
      
      async function findAndClickTranscriptButton() {
        try {
          // First, try to find the three-dot menu button
          const menuButtons = document.querySelectorAll('button[aria-label*="More actions" i], #button[aria-label*="More actions" i], ytd-menu-renderer button');
          
          for (let button of menuButtons) {
            const isVisible = button.offsetParent !== null;
            if (isVisible && button.querySelector('svg, yt-icon')) {
              sendMessage({ type: 'debug_info', message: 'Found menu button, clicking...' });
              button.click();
              
              // Wait for menu to open
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Look for transcript option in the menu
              const transcriptOptions = document.querySelectorAll(
                'ytd-menu-service-item-renderer, ' +
                'tp-yt-paper-item, ' +
                'ytd-menu-navigation-item-renderer, ' +
                '[role="menuitem"]'
              );
              
              for (let option of transcriptOptions) {
                const text = option.textContent || '';
                if (text.toLowerCase().includes('transcript') || 
                    text.toLowerCase().includes('captions') ||
                    text.toLowerCase().includes('subtitles')) {
                  sendMessage({ type: 'debug_info', message: 'Found transcript option: ' + text });
                  option.click();
                  return true;
                }
              }
            }
          }
          
          // Alternative: Look for direct transcript button (some videos have it)
          const directTranscriptButtons = document.querySelectorAll(
            'button[aria-label*="transcript" i], ' +
            'button[aria-label*="show transcript" i], ' +
            '[aria-label*="transcript" i][role="button"]'
          );
          
          for (let button of directTranscriptButtons) {
            if (button.offsetParent !== null) {
              sendMessage({ type: 'debug_info', message: 'Found direct transcript button' });
              button.click();
              return true;
            }
          }
          
          return false;
        } catch (error) {
          sendMessage({ type: 'debug_info', message: 'Error finding transcript button: ' + error.message });
          return false;
        }
      }
      
      async function extractTranscriptFromPanel() {
        try {
          // Wait for transcript panel to load
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          let transcript = '';
          const transcriptSelectors = [
            // Primary selectors for transcript segments
            'ytd-transcript-segment-list-renderer ytd-transcript-segment-renderer',
            'ytd-transcript-body-renderer ytd-transcript-segment-renderer',
            '.segment-text',
            '[class*="transcript"][class*="segment"]',
            'div[class*="cue"]',
            'div[class*="caption-window"]',
            '.ytp-caption-segment',
            // Fallback selectors
            '#segments-container ytd-transcript-segment-renderer',
            'ytd-engagement-panel-section-list-renderer[target-id*="transcript"] .segment-text'
          ];
          
          // Debug: Log what we're seeing
          sendMessage({ 
            type: 'debug_info', 
            message: 'Document contains: ' + document.body.innerHTML.substring(0, 200) 
          });
          
          for (let selector of transcriptSelectors) {
            const segments = document.querySelectorAll(selector);
            if (segments.length > 0) {
              sendMessage({ type: 'debug_info', message: 'Found ' + segments.length + ' transcript segments with selector: ' + selector });
              
              segments.forEach((segment, index) => {
                // Try multiple ways to get the text
                let text = '';
                
                // For cue divs, get direct text content
                if (selector.includes('cue')) {
                  // Log the element structure for debugging
                  if (index === 0) {
                    sendMessage({ 
                      type: 'debug_info', 
                      message: 'First cue element HTML: ' + segment.outerHTML.substring(0, 200) 
                    });
                    sendMessage({ 
                      type: 'debug_info', 
                      message: 'First cue element text: ' + segment.textContent 
                    });
                  }
                  
                  // Try different methods to get text
                  text = segment.textContent || segment.innerText || '';
                  
                  // If no text, try getting from all child elements
                  if (!text) {
                    const childTexts = [];
                    segment.childNodes.forEach(node => {
                      if (node.nodeType === Node.TEXT_NODE) {
                        childTexts.push(node.textContent);
                      } else if (node.nodeType === Node.ELEMENT_NODE) {
                        childTexts.push(node.textContent);
                      }
                    });
                    text = childTexts.join(' ');
                  }
                  
                  // Also try innerHTML and strip tags
                  if (!text) {
                    text = segment.innerHTML.replace(/<[^>]*>/g, ' ').trim();
                  }
                } else {
                  // Method 1: Look for specific text element
                  const textElement = segment.querySelector('.segment-text, [class*="text"], .cue-group-start-offset');
                  if (textElement) {
                    text = textElement.textContent || textElement.innerText || '';
                  }
                  
                  // Method 2: Get all text content but filter out timestamps
                  if (!text) {
                    const clone = segment.cloneNode(true);
                    // Remove timestamp elements
                    const timestamps = clone.querySelectorAll('.segment-timestamp, [class*="timestamp"], [class*="time"]');
                    timestamps.forEach(ts => ts.remove());
                    text = clone.textContent || clone.innerText || '';
                  }
                }
                
                // Clean up the text
                text = text.trim();
                
                // Log what we found for debugging
                if (index < 5) { // Only log first 5 to avoid spam
                  sendMessage({ 
                    type: 'debug_info', 
                    message: 'Segment ' + index + ' text: "' + text.substring(0, 50) + '"' 
                  });
                }
                
                // Skip if it's just a timestamp or too short
                if (text && !text.match(/^\\d+:\\d+$/) && text.length > 2) {
                  transcript += text + ' ';
                }
              });
              
              if (transcript.length > 50) {
                sendMessage({ 
                  type: 'debug_info', 
                  message: 'Transcript collected: ' + transcript.length + ' chars' 
                });
                break;
              }
            }
          }
          
          // Alternative method: Try to get text from the entire transcript panel
          if (transcript.length < 50) {
            const panelSelectors = [
              'ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"]',
              '#transcript-scrollbox',
              '[target-id="engagement-panel-searchable-transcript"]',
              'ytd-transcript-renderer',
              '.caption-window',
              '.ytp-caption-window-container'
            ];
            
            for (let selector of panelSelectors) {
              const panel = document.querySelector(selector);
              if (panel) {
                sendMessage({ type: 'debug_info', message: 'Found transcript panel: ' + selector });
                
                // Get all text from panel
                const allTextElements = panel.querySelectorAll('*');
                allTextElements.forEach(element => {
                  // Only get text from leaf nodes
                  if (element.childElementCount === 0) {
                    const text = element.textContent?.trim() || '';
                    if (text && !text.match(/^\\d+:\\d+$/) && text.length > 2 && 
                        !text.includes('Search in video') && 
                        !text.includes('Transcript') &&
                        !text.includes('Follow along')) {
                      transcript += text + ' ';
                    }
                  }
                });
                
                if (transcript.length > 50) {
                  break;
                }
              }
            }
          }
          
          // Final attempt: Look for any div with substantial text content
          if (transcript.length < 50) {
            sendMessage({ type: 'debug_info', message: 'Trying final extraction method...' });
            
            // Look for divs that might contain transcript text
            const allDivs = document.querySelectorAll('div');
            const transcriptTexts = [];
            
            allDivs.forEach(div => {
              const text = div.textContent?.trim() || '';
              // Look for divs with substantial text that aren't UI elements
              if (text.length > 20 && text.length < 500 && 
                  !text.includes('Subscribe') && 
                  !text.includes('Share') && 
                  !text.includes('Download') &&
                  !text.includes('views') &&
                  !text.includes('ago') &&
                  div.offsetParent !== null) { // Must be visible
                
                // Check if this div has many child elements (likely UI)
                if (div.childElementCount < 5) {
                  transcriptTexts.push(text);
                }
              }
            });
            
            // If we found potential transcript text, use it
            if (transcriptTexts.length > 5) {
              transcript = transcriptTexts.join(' ');
              sendMessage({ 
                type: 'debug_info', 
                message: 'Found ' + transcriptTexts.length + ' potential transcript segments' 
              });
            }
          }
          
          return transcript.trim();
        } catch (error) {
          sendMessage({ type: 'debug_info', message: 'Error extracting transcript: ' + error.message });
          return '';
        }
      }
      
      // New function to extract from closed captions
      async function extractFromClosedCaptions() {
        try {
          sendMessage({ type: 'debug_info', message: 'Attempting to extract from closed captions...' });
          
          // First, try to enable captions if they're not already on
          const ccButton = document.querySelector('.ytp-subtitles-button');
          if (ccButton && ccButton.getAttribute('aria-pressed') === 'false') {
            ccButton.click();
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          let captionText = '';
          const startTime = Date.now();
          
          // Monitor captions for a period of time
          return new Promise((resolve) => {
            const captionObserver = setInterval(() => {
              const captionSelectors = [
                '.ytp-caption-segment',
                '.captions-text',
                '.ytp-caption-window-container',
                'div[class*="caption"]',
                '.ytp-cues-container',
                'span[class*="ytp-caption"]'
              ];
              
              for (let selector of captionSelectors) {
                const captionElements = document.querySelectorAll(selector);
                captionElements.forEach(element => {
                  const text = element.textContent?.trim() || '';
                  if (text && text.length > 1 && !captionText.includes(text)) {
                    captionText += text + ' ';
                    sendMessage({ 
                      type: 'debug_info', 
                      message: 'Caption text found: ' + text.substring(0, 30) + '...' 
                    });
                  }
                });
              }
              
              // Stop after 10 seconds or if we have enough text
              if (Date.now() - startTime > 10000 || captionText.length > 500) {
                clearInterval(captionObserver);
                resolve(captionText);
              }
            }, 500);
          });
        } catch (error) {
          sendMessage({ type: 'debug_info', message: 'CC extraction error: ' + error.message });
          return '';
        }
      }
      
      // Force open transcript with multiple attempts
      async function forceOpenTranscript() {
        try {
          sendMessage({ type: 'debug_info', message: 'Force opening transcript...' });
          
          // Method 1: Click description to ensure page is interactive
          const descriptionButton = document.querySelector('#expand, #description');
          if (descriptionButton) {
            descriptionButton.click();
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          // Method 2: Find and click more actions button (three dots)
          const moreActionsSelectors = [
            'ytd-menu-renderer button[aria-label*="More" i]',
            'ytd-menu-renderer #button',
            'button.ytd-menu-renderer',
            '[aria-label="More actions"]',
            'yt-icon-button#button'
          ];
          
          for (let selector of moreActionsSelectors) {
            const buttons = document.querySelectorAll(selector);
            for (let button of buttons) {
              // Check if it's the right button (usually has three dots icon)
              if (button.offsetParent !== null && 
                  (button.querySelector('path[d*="M12"]') || 
                   button.querySelector('svg') ||
                   button.innerHTML.includes('more_vert'))) {
                
                sendMessage({ type: 'debug_info', message: 'Clicking more actions button...' });
                button.click();
                
                // Wait for menu
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Find transcript option
                const menuItems = document.querySelectorAll(
                  'tp-yt-paper-item, ' +
                  'ytd-menu-service-item-renderer, ' +
                  'yt-formatted-string.ytd-menu-service-item-renderer'
                );
                
                for (let item of menuItems) {
                  const text = item.textContent?.toLowerCase() || '';
                  if (text.includes('transcript') || text.includes('script')) {
                    sendMessage({ type: 'debug_info', message: 'Found transcript menu item: ' + text });
                    item.click();
                    
                    // Wait for transcript panel
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Now extract
                    return await extractTranscriptFromPanel();
                  }
                }
              }
            }
          }
          
          return '';
          
        } catch (error) {
          sendMessage({ type: 'debug_info', message: 'Force open error: ' + error.message });
          return '';
        }
      }
      
      // Try to use YouTube's player API to get captions
      async function tryPlayerAPI() {
        try {
          sendMessage({ type: 'debug_info', message: 'Trying YouTube player API...' });
          
          // Get the video player
          const player = document.querySelector('#movie_player');
          if (player && player.getOptions) {
            const options = player.getOptions();
            sendMessage({ 
              type: 'debug_info', 
              message: 'Player options: ' + JSON.stringify(options).substring(0, 200) 
            });
            
            // Try to get caption tracks
            if (player.getOption && player.getOption('captions', 'tracklist')) {
              const tracks = player.getOption('captions', 'tracklist');
              sendMessage({ 
                type: 'debug_info', 
                message: 'Caption tracks: ' + JSON.stringify(tracks).substring(0, 200) 
              });
            }
          }
          
          // Alternative: Check ytInitialPlayerResponse
          if (window.ytInitialPlayerResponse) {
            const captions = window.ytInitialPlayerResponse.captions;
            if (captions) {
              sendMessage({ 
                type: 'debug_info', 
                message: 'Found captions in ytInitialPlayerResponse' 
              });
              
              // Try to get caption track URL
              const captionTracks = captions.playerCaptionsTracklistRenderer?.captionTracks;
              if (captionTracks && captionTracks.length > 0) {
                const trackUrl = captionTracks[0].baseUrl;
                sendMessage({ 
                  type: 'debug_info', 
                  message: 'Caption track URL found: ' + trackUrl 
                });
                
                // Note: We can't fetch this URL directly from the browser due to CORS
                // But we can send it to the app to fetch server-side if needed
                return trackUrl;
              }
            }
          }
          
          return null;
        } catch (error) {
          sendMessage({ type: 'debug_info', message: 'Player API error: ' + error.message });
          return null;
        }
      }
      
      async function tryExtraction() {
        const videoId = getVideoId();
        if (!videoId) {
          sendMessage({ type: 'no_video_id' });
          return;
        }
        
        sendMessage({ type: 'extraction_started' });
        
        try {
          // Method 1: Direct extraction attempt
          const directTranscript = await directTranscriptExtraction();
          if (directTranscript && directTranscript.length > 50) {
            sendMessage({
              type: 'transcript_found',
              transcript: directTranscript,
              title: getVideoTitle(),
              method: 'direct_extraction'
            });
            return;
          }
          
          // Method 2: Check if transcript panel is already open
          let existingTranscript = await extractTranscriptFromPanel();
          
          if (existingTranscript && existingTranscript.length > 50) {
            sendMessage({
              type: 'transcript_found',
              transcript: existingTranscript,
              title: getVideoTitle(),
              method: 'already_open'
            });
            return;
          }
          
          // Method 2: Try YouTube player API
          const apiResult = await tryPlayerAPI();
          if (apiResult) {
            sendMessage({
              type: 'caption_url_found',
              url: apiResult,
              title: getVideoTitle()
            });
            return;
          }
          
          // Method 3: Force open transcript
          const forceTranscript = await forceOpenTranscript();
          if (forceTranscript && forceTranscript.length > 50) {
            sendMessage({
              type: 'transcript_found',
              transcript: forceTranscript,
              title: getVideoTitle(),
              method: 'forced_open'
            });
            return;
          }
          
          // Method 4: Try to open transcript panel normally
          const buttonClicked = await findAndClickTranscriptButton();
          
          if (buttonClicked) {
            // Wait and extract
            const transcript = await extractTranscriptFromPanel();
            
            if (transcript && transcript.length > 50) {
              sendMessage({
                type: 'transcript_found',
                transcript: transcript,
                title: getVideoTitle(),
                method: 'after_button_click'
              });
              return;
            } else {
              sendMessage({ 
                type: 'debug_info', 
                message: 'Transcript panel opened but no text found. Length: ' + transcript.length 
              });
            }
          }
          
          // Method 5: Try closed captions
          sendMessage({ type: 'debug_info', message: 'Trying closed captions extraction...' });
          const ccText = await extractFromClosedCaptions();
          
          if (ccText && ccText.length > 50) {
            sendMessage({
              type: 'transcript_found',
              transcript: ccText,
              title: getVideoTitle(),
              method: 'closed_captions'
            });
          } else {
            // Final attempt: Check for any transcript-like content on page
            const pageText = document.body.innerText || '';
            const transcriptMatch = pageText.match(/\[Music\]|\[Applause\]|\[Laughter\]/);
            if (transcriptMatch) {
              sendMessage({ 
                type: 'debug_info', 
                message: 'Found transcript markers but could not extract. Video may have auto-generated captions only.' 
              });
            }
            sendMessage({ type: 'no_transcript' });
          }
        } catch (error) {
          sendMessage({ 
            type: 'extraction_error', 
            error: error.message 
          });
        }
      }
      
      // Monitor URL changes
      let currentUrl = location.href;
      const urlCheckInterval = setInterval(function() {
        if (location.href !== currentUrl) {
          currentUrl = location.href;
          setTimeout(checkPage, 1000);
        }
      }, 1000);
      
      // Initial check
      setTimeout(checkPage, 1500);
      
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

        case "caption_url_found":
          setExtracting(false);
          console.log("Caption URL found:", data.url);
          Alert.alert(
            "Transcript Found",
            "We found the transcript data but need to process it differently. Please use the manual option for now.",
            [
              { text: "Manual Input", onPress: () => setShowManualInput(true) },
              { text: "OK", style: "cancel" },
            ]
          );
          break;

        case "no_transcript":
          setExtracting(false);
          Alert.alert(
            "No Transcript Found",
            "Could not find a transcript for this video. This might be because:\n\n• The video doesn't have captions/transcripts\n• The transcript is disabled by the creator\n• The page structure has changed\n\nTry clicking the three-dot menu below the video and look for 'Show transcript' option manually.",
            [
              { text: "Manual Input", onPress: () => setShowManualInput(true) },
              { text: "OK", style: "cancel" },
            ]
          );
          break;

        case "extraction_error":
          setExtracting(false);
          console.error("Extraction error:", data.error);
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
        "Please navigate to a YouTube video page first."
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
          "The extraction took too long. This video might not have transcripts available.\n\nTry:\n• Opening the transcript manually (three-dot menu → Show transcript)\n• Using a different video\n• Using the manual input option"
        );
      }
    }, 30000);
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
            Navigate to a video with captions
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
        userAgent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
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

      {!loading && showInstructions && (
        <View
          style={[styles.instructions, { backgroundColor: colors.background }]}
        >
          <View style={styles.instructionContent}>
            <IconSymbol name="info.circle.fill" size={20} color={colors.tint} />
            <View style={styles.instructionTextContainer}>
              <Text style={[styles.instructionsText, { color: colors.text }]}>
                {canExtract
                  ? "Please manually open the transcript first:\n1. Click the three-dot menu (⋮) below the video\n2. Click 'Show transcript'\n3. Wait for transcript to appear\n4. Then click Extract above"
                  : "Navigate to a YouTube video that has captions/transcripts"}
              </Text>

              {debugInfo && (
                <Text style={[styles.debugText, { color: colors.text + "60" }]}>
                  Debug: {debugInfo}
                </Text>
              )}
            </View>
          </View>

          {canExtract && (
            <>
              <TouchableOpacity
                style={[
                  styles.hideInstructionsButton,
                  { backgroundColor: colors.text + "10" },
                ]}
                onPress={() => setShowInstructions(false)}
              >
                <Text
                  style={[
                    styles.hideInstructionsText,
                    { color: colors.text + "60" },
                  ]}
                >
                  Hide Instructions
                </Text>
              </TouchableOpacity>
              <Text style={[styles.videoIdText, { color: colors.text + "60" }]}>
                Video ID: {videoId}
              </Text>
            </>
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
                  1. Click the three-dot menu (⋮) below the video{"\n"}
                  2. Click "Show transcript"{"\n"}
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

  hideInstructionsButton: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  hideInstructionsText: {
    fontSize: 12,
    fontWeight: "500",
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
