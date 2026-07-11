'use client';

import { useRef, useState, useEffect } from 'react';

export default function TestCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'idle' | 'starting' | 'running' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<string>('');

  const startCamera = async () => {
    setStatus('starting');
    setError(null);
    setVideoInfo('');

    try {
      console.log('📷 开始请求摄像头权限...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      console.log('✅ 摄像头权限获取成功');
      console.log('流信息:', stream);
      console.log('视频轨道数量:', stream.getVideoTracks().length);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        // 监听事件
        video.onloadedmetadata = () => {
          console.log('✅ 视频元数据已加载');
          console.log('视频尺寸:', video.videoWidth, 'x', video.videoHeight);
          console.log('ReadyState:', video.readyState);

          setVideoInfo(`尺寸: ${video.videoWidth}x${video.videoHeight}, ReadyState: ${video.readyState}`);
        };

        video.oncanplay = () => {
          console.log('✅ 视频可以播放');
          setStatus('running');
        };

        video.onplay = () => {
          console.log('✅ 视频正在播放');
        };

        video.onerror = (e) => {
          console.error('❌ 视频错误:', e);
          console.error('错误对象:', (e.target as HTMLVideoElement).error);
          const mediaError = (e.target as HTMLVideoElement).error;
          if (mediaError) {
            console.error('错误代码:', mediaError.code);
            console.error('错误消息:', mediaError.message);
          }
        };

        // 尝试播放
        try {
          await video.play();
          console.log('✅ 视频播放成功');
        } catch (playError) {
          console.error('❌ 视频播放失败:', playError);
          throw playError;
        }
      }

      setStatus('running');
    } catch (err) {
      console.error('❌ 摄像头启动失败:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setStatus('error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">📷 摄像头测试页面</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400">状态:</span>
              <span className={`font-semibold ${
                status === 'running' ? 'text-green-400' :
                status === 'error' ? 'text-red-400' :
                status === 'starting' ? 'text-yellow-400' :
                'text-gray-400'
              }`}>
                {status === 'running' ? '✅ 运行中' :
                 status === 'error' ? '❌ 错误' :
                 status === 'starting' ? '⏳ 启动中...' :
                 '💤 未启动'}
              </span>
            </div>

            {videoInfo && (
              <div className="text-sm text-gray-300">{videoInfo}</div>
            )}

            {error && (
              <div className="mt-2 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
                <strong>错误:</strong> {error}
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-6">
            <button
              onClick={startCamera}
              disabled={status === 'running' || status === 'starting'}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {status === 'running' ? '已启动' : '启动摄像头'}
            </button>
            <button
              onClick={stopCamera}
              disabled={status !== 'running'}
              className="px-6 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              停止摄像头
            </button>
          </div>

          <div className="bg-black rounded-lg overflow-hidden" style={{ minHeight: '480px', aspectRatio: '4/3' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          </div>

          {status === 'running' && (
            <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded text-green-300 text-sm">
              ✅ 如果你能看到自己的画面，说明摄像头工作正常！
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-3">🔍 调试信息</h2>
          <div className="space-y-2 text-sm text-gray-300">
            <div>• 浏览器支持: <span className={navigator.mediaDevices ? 'text-green-400' : 'text-red-400'}>{navigator.mediaDevices ? '✅' : '❌'}</span></div>
            <div>• HTTPS 环境: <span className={window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'text-green-400' : 'text-red-400'}>{window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? '✅' : '❌'}</span></div>
            <div>• 用户代理: <span className="text-gray-400">{navigator.userAgent.split(' ').slice(-2)[0]}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
