import React, { useState, useRef } from 'react';
import { UserProgress, UserSettings } from '../types';
import { 
  User, 
  Timer, 
  Volume2, 
  Languages, 
  Download, 
  Upload, 
  Check, 
  Save, 
  Sparkles,
  HelpCircle,
  Bell
} from 'lucide-react';
import { speakText } from '../services/speech';

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
  const [settings, setSettings] = useState<UserSettings>({ ...progress.settings });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    onUpdateProgress({
      ...progress,
      settings,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    onLogActivity('Updated App Settings', '更新学习偏好设置', `Daily goal: ${settings.dailyGoalMinutes}m`);
  };

  const handleTestAudio = () => {
    speakText('Hello! This is a sample of your selected English speech voice.', {
      rate: settings.speechRate,
      accent: settings.voiceAccent,
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
            Settings & Preferences · 学习设置
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personalize your study goal, speech voice, and data backup options.
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

      {/* 2. User Profile & Daily Goal */}
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

      {/* 3. Speech & Pronunciation Settings */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Volume2 className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-bold text-slate-900">
            Audio & Speech Pronunciation · 语音朗读设置
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Accent Target (英语口音)
            </label>
            <select
              value={settings.voiceAccent}
              onChange={(e) => setSettings({ ...settings, voiceAccent: e.target.value as 'en-US' | 'en-GB' })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-hidden"
            >
              <option value="en-US">American English (美式英语 en-US)</option>
              <option value="en-GB">British English (英式英语 en-GB)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Speech Playback Speed (朗读语速)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[0.8, 1.0, 1.2].map((rate) => (
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
                  {rate}x {rate === 0.8 ? '(Slower)' : rate === 1.2 ? '(Faster)' : '(Normal)'}
                </button>
              ))}
            </div>
          </div>

        </div>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Uses your browser's native Web Speech synthesis engine.
          </span>
          <button
            onClick={handleTestAudio}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Test Voice Sound</span>
          </button>
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
