import React, { useState, useRef } from 'react';
import { UserProgress, UserSettings, VoiceProfileId } from '../types';
import { 
  User, 
  Volume2, 
  Languages, 
  Download, 
  Upload, 
  Check, 
  Save, 
  Sparkles, 
  Radio, 
  Gauge, 
  ShieldCheck,
  Play
} from 'lucide-react';
import { 
  NATURAL_VOICE_OPTIONS, 
  playNaturalVoice, 
  stopCurrentAudio 
} from '../services/speech';

interface SettingsViewProps {
  progress: UserProgress;
  onUpdateProgress: (updated: UserProgress) => void;
  onLogActivity: (title: string, titleZh: string, details?: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  progress,
  onUpdateProgress,
  onLogActivity,
}) => {
  const [settings, setSettings] = useState<UserSettings>({
    ...progress.settings,
    voiceId: progress.settings.voiceId || 'us-female',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    onUpdateProgress({
      ...progress,
      settings,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onLogActivity('Updated App Settings', '更新学习偏好设置', `Voice: ${settings.voiceId || 'us-female'}`);
  };

  const handlePreviewVoice = async (voiceId: VoiceProfileId, previewText: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    stopCurrentAudio();
    setPreviewingVoiceId(voiceId);

    await playNaturalVoice(previewText, {
      voiceId,
      speed: settings.speechRate,
      onEnd: () => setPreviewingVoiceId(null),
      onError: () => setPreviewingVoiceId(null),
    });
  };

  const selectVoice = (voiceId: VoiceProfileId) => {
    const matched = NATURAL_VOICE_OPTIONS.find((v) => v.id === voiceId);
    setSettings({
      ...settings,
      voiceId,
      voiceGender: matched?.gender || 'female',
      voiceAccent: matched?.accent || 'en-US',
    });
  };

  // Export progress as JSON file
  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(progress, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `my_english_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onLogActivity('Exported Learning Backup', '导出学习进度备份');
  };

  // Import JSON backup
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as UserProgress;
        if (parsed.learnedWords && parsed.settings) {
          onUpdateProgress(parsed);
          setSettings(parsed.settings);
          alert('Learning progress restored successfully from backup file!');
          onLogActivity('Imported Learning Backup', '导入学习进度备份');
        } else {
          alert('Invalid backup file format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Settings & Voice Preferences · 学习设置
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Choose high-quality human-like teacher voices, adjust speed, and manage learning goals.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </div>

      {/* 2. High-Quality Natural Human-like Voice Selection */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Teacher Voice Selection · 英语名师原声
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
            High-Quality Neural Voices
          </span>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Select between American and British English neural teacher voices. Click "Preview" to audition each voice with natural intonation, pauses, and expressive rhythm.
        </p>

        {/* 4 Voice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {NATURAL_VOICE_OPTIONS.map((voice) => {
            const isSelected = (settings.voiceId || 'us-female') === voice.id;
            const isPreviewing = previewingVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => selectVoice(voice.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-sky-50/70 border-sky-400 shadow-2xs ring-1 ring-sky-300'
                    : 'bg-slate-50/70 border-slate-200/90 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        isSelected ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <span className="font-bold text-sm text-slate-900">{voice.name}</span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {voice.accentLabel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {voice.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 capitalize">
                    {voice.gender} · {voice.accent}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => handlePreviewVoice(voice.id, voice.previewText, e)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      isPreviewing
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-white border border-slate-200 text-slate-700 hover:text-sky-600 hover:bg-sky-50'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>{isPreviewing ? 'Playing...' : 'Preview (试听)'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Speed Controls with Pitch Preservation */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Playback Speed · 语速控制 (Natural Pitch Preserved)
            </span>
            <span className="font-bold text-sky-600">{settings.speechRate}x</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[0.75, 1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setSettings({ ...settings, speechRate: rate })}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                  settings.speechRate === rate
                    ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {rate}x {rate === 0.75 ? '(Learner)' : rate === 1.0 ? '(Normal)' : '(Fast)'}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400">
            Speed adjustments preserve the natural vocal pitch and rhythm without chipmunk or robotic distortion.
          </p>
        </div>

        {/* API Architecture & Fallback Disclosure */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Server-Side Audio Proxy & Offline Fallback</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            TTS calls are processed securely server-side using Gemini Text-to-Speech (<code className="text-slate-700">gemini-3.8-flash-lite-tts</code>). Audio is cached both on the server and in your browser to minimize latency and bandwidth. If network or API quota is unavailable, the platform automatically switches to your browser's local speech engine.
          </p>
        </div>
      </div>

      {/* 3. Learner Profile & Daily Goal */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <User className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Learner Profile & Goals · 学习者档案与每日目标
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Your Name / Nickname (称呼)
            </label>
            <input
              type="text"
              value={settings.userName}
              onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-sky-500 text-sm font-medium"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Daily Study Goal (每日学习目标时长)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 15, 20, 30].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => setSettings({ ...settings, dailyGoalMinutes: min })}
                  className={`py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                    settings.dailyGoalMinutes === min
                      ? 'bg-sky-500 text-white border-sky-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bilingual Display Mode */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Languages className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Bilingual Preference · 双语显示偏好
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {[
            { id: 'both', label: 'Bilingual (Default)', zh: '总是显示中英双语' },
            { id: 'click', label: 'Click to Reveal', zh: '点击/悬浮才显示中文' },
            { id: 'english-only', label: 'English Immersion', zh: '纯英文沉浸模式' },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setSettings({ ...settings, bilingualMode: mode.id as any })}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                settings.bilingualMode === mode.id
                  ? 'bg-sky-50 border-sky-400 text-sky-900 shadow-2xs font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="font-bold text-xs">{mode.label}</div>
              <div className="text-[11px] text-slate-500">{mode.zh}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Data Backup & Local Storage */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Download className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Backup & Export Data · 数据备份与恢复
          </h2>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed">
          Your learning progress and custom lessons are preserved in your browser's local storage and IndexedDB. You can export a JSON backup at any time to preserve your vocabulary mastery and streaks.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleExportData}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-600" />
            <span>Export Learning Progress (导出 JSON)</span>
          </button>

          <input
            ref={importFileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportData}
            className="hidden"
          />
          <button
            onClick={() => importFileRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4 text-sky-600" />
            <span>Import Backup (恢复数据)</span>
          </button>
        </div>
      </div>

    </div>
  );
};
