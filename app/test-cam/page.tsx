'use client';

import { useRef, useState } from 'react';

export default function TestCamPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [streamInfo, setStreamInfo] = useState<string>('');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[${timestamp}]`, message);
  };

  const testCamera = async () => {
    setLogs([]);
    addLog('🔍 开始摄像头测试...');

    // 1. 检查浏览器支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addLog('❌ 浏览器不支持 getUserMedia API');
      return;
    }
    addLog('✅ 浏览器支持 getUserMedia');

    // 2. 检查权限状态
    try {
      addLog('🔍 请求摄像头权限...');
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      addLog(`📋 权限状态: ${permissionStatus.state}`);

      if (permissionStatus.state === 'denied') {
        addLog('❌ 摄像头权限被拒绝！请检查浏览器设置');
        return;
      }
    } catch (e) {
      addLog('⚠️ 无法查询权限状态，继续尝试...');
    }

    // 3. 获取媒体流
    try {
      addLog('📡 正在获取摄像头流...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      addLog('✅ 成功获取摄像头流');

      // 获取流信息
      const videoTracks = stream.getVideoTracks();
      addLog(`📹 视频轨道数量: ${videoTracks.length}`);

      if (videoTracks.length > 0) {
        const track = videoTracks[0];
        const settings = track.getSettings();
        addLog(`⚙️ 轨道设置: ${JSON.stringify(settings, null, 2)}`);

        const capabilities = (track as any).getCapabilities?.();
        if (capabilities) {
          addLog(`🔧 轨道能力: ${JSON.stringify(capabilities, null, 2)}`);
        }

        setStreamInfo(
          `分辨率: ${settings.width?.toString() || 'N/A'}x${settings.height?.toString() || 'N/A'}, ` +
          `帧率: ${settings.frameRate?.toString() || 'N/A'}fps, ` +
          `Facing: ${settings.facingMode || 'N/A'}`
        );
      }

      // 4. 设置视频元素
      if (videoRef.current) {
        const video = videoRef.current;

        // 清理旧的流
        if (video.srcObject) {
          const oldStream = video.srcObject as MediaStream;
          oldStream.getTracks().forEach(t => t.stop());
        }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;

        addLog('🎬 设置视频元素属性');

        // 5. 等待视频加载
        addLog('⏳ 等待视频元数据加载...');

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('视频加载超时'));
          }, 10000);

          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            addLog(`✅ 元数据加载完成: ${video.videoWidth}x${video.videoHeight}`);
            addLog(`📊 ReadyState: ${video.readyState}`);
            resolve();
          };

          video.onerror = (e) => {
            clearTimeout(timeout);
            const error = (e.target as HTMLVideoElement).error;
            addLog(`❌ 视频错误: code=${error?.code}, message=${error?.message}`);
            reject(error);
          };
        });

        // 6. 尝试播放
        addLog('▶️ 尝试播放视频...');
        try {
          await video.play();
          addLog('✅ 视频播放成功！');
          addLog('🎉 如果你看到画面，摄像头工作正常！');
        } catch (playError) {
          addLog(`❌ 播放失败: ${playError}`);
        }
      }

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      addLog(`❌ 错误: ${errorMsg}`);

      if (errorMsg.includes('Permission denied')) {
        addLog('💡 提示: 请在浏览器地址栏点击锁图标，允许摄像头权限');
      } else if (errorMsg.includes('NotFound')) {
        addLog('💡 提示: 未找到摄像头设备，请检查摄像头连接');
      } else if (errorMsg.includes('NotAllowedError')) {
        addLog('💡 提示: 摄像头权限被拒绝');
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
      addLog('🛑 已停止摄像头');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">🔍 摄像头深度诊断</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：视频预览 */}
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-white">摄像头预览</h2>
                <div className="flex gap-2">
                  <button
                    onClick={testCamera}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                  >
                    测试摄像头
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                  >
                    停止
                  </button>
                </div>
              </div>

              <div className="bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>

              {streamInfo && (
                <div className="mt-3 p-3 bg-green-500/20 border border-green-500/50 rounded text-green-300 text-sm">
                  {streamInfo}
                </div>
              )}
            </div>

            {/* 系统信息 */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-white mb-3">系统信息</h2>
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>用户代理:</span>
                  <span className="text-gray-400">{navigator.userAgent.split(' ').slice(-2)[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span>协议:</span>
                  <span className={window.location.protocol === 'https:' || window.location.hostname === 'localhost' ? 'text-green-400' : 'text-red-400'}>
                    {window.location.protocol}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>getUserMedia支持:</span>
                  <span className={!!navigator.mediaDevices?.getUserMedia ? 'text-green-400' : 'text-red-400'}>
                    {!!navigator.mediaDevices?.getUserMedia ? '✅' : '❌'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>当前时间:</span>
                  <span className="text-gray-400">{new Date().toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：日志 */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-white mb-3">诊断日志</h2>
            <div className="bg-black rounded-lg p-3 h-[500px] overflow-y-auto font-mono text-xs">
              {logs.length === 0 ? (
                <div className="text-gray-500">点击"测试摄像头"开始诊断...</div>
              ) : (
                logs.map((log, i) => (
                  <div
                    key={i}
                    className={`mb-1 ${
                      log.includes('✅') ? 'text-green-400' :
                      log.includes('❌') ? 'text-red-400' :
                      log.includes('⚠️') ? 'text-yellow-400' :
                      'text-gray-300'
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 帮助信息 */}
        <div className="mt-6 bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">💡 如果摄像头显示黑屏</h3>
          <ol className="text-sm text-blue-200 space-y-1 list-decimal list-inside">
            <li>检查浏览器地址栏，确保摄像头权限为"允许"</li>
            <li>打开 macOS 系统设置 → 隐私与安全 → 摄像头，确保浏览器有权限</li>
            <li>检查其他应用（如 Zoom、Teams）是否占用摄像头</li>
            <li>尝试刷新页面并重新测试</li>
            <li>检查系统摄像头是否在其他应用中正常工作</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
