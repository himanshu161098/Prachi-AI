import { ToolService } from '../src/services/toolService';
import { CognitiveBrain } from '../src/services/aiOrchestrator/cognitiveBrain';
import { MediaPlaybackService } from '../src/services/mediaPlaybackService';
import { signToken } from '../src/utils/jwt';
import { config } from '../src/config';

async function runTests() {
  console.log('=== TEST 1: MediaPlaybackService Direct Track Resolution ===');
  const track1 = await MediaPlaybackService.resolveYouTubeFirstTrack('trending hit songs');
  console.log('Resolved First Trending Song (Excluding Ads):', track1);

  if (!track1 || !track1.videoId || !track1.watchUrl.includes('watch?v=')) {
    throw new Error('MediaPlaybackService failed to extract 1st playable YouTube video');
  }

  const track2 = await MediaPlaybackService.resolveYouTubeFirstTrack('kesariya arijit singh');
  console.log('Resolved Specific Song (Kesariya):', track2);
  if (!track2 || !track2.videoId || !track2.watchUrl.includes('watch?v=')) {
    throw new Error('MediaPlaybackService failed for Kesariya');
  }

  console.log('\n=== TEST 2: ToolService.resolveApplicationActionAsync Direct Play Tests ===');
  const ytPlay = await ToolService.resolveApplicationActionAsync({
    appName: 'youtube',
    action: 'play'
  });
  console.log('YouTube Play Resolution:', ytPlay);
  if (!ytPlay.target.includes('watch?v=') || !ytPlay.target.includes('autoplay=1') || !ytPlay.videoId) {
    throw new Error('ToolService.resolveApplicationActionAsync did not return direct watch URL');
  }

  console.log('\n=== TEST 3: CognitiveBrain.reasonAsync End-to-End ===');
  const brainRes = await CognitiveBrain.reasonAsync('youtube open karke song play karo');
  console.log('CognitiveBrain Play Response:', {
    text: brainRes.text,
    clientAction: brainRes.clientAction
  });
  if (!brainRes.clientAction || !brainRes.clientAction.target.includes('watch?v=') || !brainRes.clientAction.videoId) {
    throw new Error('CognitiveBrain did not include direct watch target & videoId in clientAction');
  }

  console.log('\n=== TEST 4: Live HTTP /api/chat/message Endpoint ===');
  const token = signToken({ id: 'usr-demo-001', email: 'demo@prachi.ai' }, config.jwtSecret);
  const chatResponse = await fetch('http://localhost:3001/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      message: 'youtube open karke song play karo',
      provider: 'local_heuristic'
    })
  });

  if (!chatResponse.ok) {
    const errText = await chatResponse.text();
    throw new Error(`HTTP /api/chat/message failed with status ${chatResponse.status}: ${errText}`);
  }

  const chatJson: any = await chatResponse.json();
  console.log('Live HTTP Response:', {
    response: chatJson.response,
    clientAction: chatJson.clientAction
  });

  if (!chatJson.clientAction || !chatJson.clientAction.target.includes('watch?v=') || !chatJson.clientAction.videoId) {
    throw new Error('Live chat HTTP response did not contain direct 1st song watch target & videoId');
  }

  console.log('\n🎉 ALL TESTS PASSED! YouTube 1st song (excluding ads) plays automatically and directly!');
}

runTests().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
