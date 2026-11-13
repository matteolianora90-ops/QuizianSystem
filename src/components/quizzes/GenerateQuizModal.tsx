import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { generateOfflineQuestions } from '../../utils/localQuizGenerator';
import { extractDocxText } from '../../utils/docxParser';
import {
  QUESTION_TYPE_OPTIONS,
  formatQuestionTypeLabel,
} from '../../utils/questionUtils';
import { Question, QuestionType, DifficultyLevel, Quiz, StudyMaterial, StudyMaterialSourceType } from '../../types';
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  WifiOff,
  CheckSquare
} from 'lucide-react';

const QUESTION_COUNT_OPTIONS = [5, 8, 10, 15, 20, 30];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const DEFAULT_SELECTED_TYPES: QuestionType[] = [
  'multiple_choice',
  'identification',
  'scrambled_word',
];

export const GenerateQuizModal: React.FC = () => {
  const {
    setActiveScreen,
    saveQuiz,
    saveStudyMaterial,
    materialDraftForGeneration,
    setMaterialDraftForGeneration,
    startGame,
    setSelectedQuizForChallenge,
    setActiveTab,
  } = useApp();
  const isOnline = useOnlineStatus();

  // Workflow steps: 'input' | 'generating' | 'review'
  const [step, setStep] = useState<'input' | 'generating' | 'review'>('input');

  // Input state
  const [activeTab, setActiveTabMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; text?: string; base64?: string; mimeType?: string } | null>(null);
  const [quizTitle, setQuizTitle] = useState('Operating Systems & Concurrency');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(10);

  // Selected question types (multi-select)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>(DEFAULT_SELECTED_TYPES);

  // Generation & Review status
  const [generationSource, setGenerationSource] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSavingQuiz, setIsSavingQuiz] = useState(false);

  // Generated questions for review
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [reusedMaterialId, setReusedMaterialId] = useState<string | null>(null);

  useEffect(() => {
    if (!materialDraftForGeneration) return;
    setQuizTitle(materialDraftForGeneration.title.replace(/\s*—\s*.*$/, '') || 'Custom Study Quiz');
    setReusedMaterialId(materialDraftForGeneration.id);
    if (materialDraftForGeneration.fileName && (materialDraftForGeneration.fileDataUrl || materialDraftForGeneration.textContent)) {
      setActiveTabMode('upload');
      setUploadedFile({
        name: materialDraftForGeneration.fileName,
        size: materialDraftForGeneration.fileSize || 'Saved offline',
        text: materialDraftForGeneration.textContent,
        base64: materialDraftForGeneration.fileDataUrl,
        mimeType: materialDraftForGeneration.mimeType,
      });
    } else if (materialDraftForGeneration.textContent) {
      setActiveTabMode('paste');
      setPastedText(materialDraftForGeneration.textContent);
    }
    setMaterialDraftForGeneration(null);
  }, [materialDraftForGeneration, setMaterialDraftForGeneration]);

  // Pre-filled sample notes for instant one-click student testing
  const sampleNotes = [
    {
      title: 'Operating Systems & Concurrency',
      text: `Operating Systems manage computer hardware and software resources.
Processes represent programs in execution, while Threads are lightweight units of execution within a process that share the same address space.
A Deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource held by some other process.
The four necessary conditions for deadlock are: Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.
Semaphores and Mutexes are synchronization primitives used to prevent race conditions in critical sections.
Virtual Memory uses paging to map virtual addresses to physical frames, allowing processes to execute without requiring contiguous memory.`,
    },
    {
      title: 'Database Management Systems',
      text: `A Database Management System (DBMS) allows structured data storage and retrieval.
A Primary Key uniquely identifies each record in a relational database table.
Foreign Keys enforce referential integrity between linked parent and child tables.
Normalization organizes data to reduce redundancy and eliminate anomalies.
First Normal Form (1NF) ensures atomic column values. Second Normal Form (2NF) eliminates partial dependencies. Third Normal Form (3NF) eliminates transitive dependencies.
ACID properties stand for Atomicity, Consistency, Isolation, and Durability.
Indexes improve query search speeds by using B-tree structures at the expense of extra storage and write overhead.`,
    },
    {
      title: 'Human-Computer Interaction & Usability',
      text: `Human-Computer Interaction (HCI) is the study of how people interact with computers and technology.
Don Norman defined Affordances as the perceived and actual properties of an object that determine how it could be used.
Jakob Nielsen established 10 Usability Heuristics, including Visibility of System Status and Match between system and the real world.
Fitts's Law states that the time required to move to a target depends on the distance to the target and the width of the target.
Hick's Law describes that the time it takes to make a decision increases logarithmically with the number of options.
Mental Models represent what a user believes about the system at hand, guiding their interactions.`,
    },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setGenerationError('File exceeds the 10 MB limit. Please upload a smaller study file.');
      e.target.value = '';
      return;
    }

    setGenerationError(null);
    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    const lowerName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const isDocx = lowerName.endsWith('.docx');

    if (isImage || isPdf) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setUploadedFile({
          name: file.name,
          size: sizeStr,
          base64,
          mimeType: isPdf ? 'application/pdf' : file.type,
        });
        setQuizTitle(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsDataURL(file);
    } else if (isDocx) {
      const cleanText = await extractDocxText(file);
      if (!cleanText.trim()) {
        setGenerationError('Could not extract readable text from this Word document. Try pasting the notes or uploading a PDF.');
        e.target.value = '';
        return;
      }
      setUploadedFile({
        name: file.name,
        size: sizeStr,
        text: cleanText.slice(0, 24000),
      });
      setQuizTitle(file.name.replace(/\.[^/.]+$/, ''));
    } else {
      const rawText = await file.text().catch(() => '');
      if (!rawText.trim()) {
        setGenerationError('The uploaded text file appears to be empty.');
        e.target.value = '';
        return;
      }
      setUploadedFile({
        name: file.name,
        size: sizeStr,
        text: rawText.slice(0, 24000),
      });
      setQuizTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    // Reset input so re-selecting the same file works
    e.target.value = '';
  };

  const toggleQuestionType = (type: QuestionType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // keep at least one selected
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const allTypesSelected = selectedTypes.length === QUESTION_TYPE_OPTIONS.length;

  const handleToggleSelectAllTypes = () => {
    if (allTypesSelected) {
      setSelectedTypes(DEFAULT_SELECTED_TYPES);
    } else {
      setSelectedTypes(QUESTION_TYPE_OPTIONS.map((t) => t.id));
    }
  };

  const handleGenerate = async () => {
    if (activeTab === 'upload' && !uploadedFile) {
      setGenerationError('Please upload a study file (PDF, DOCX, TXT, or image) or switch to "Paste Notes".');
      return;
    }
    if (activeTab === 'paste' && !pastedText.trim()) {
      setGenerationError('Please paste your study notes or pick one of the sample notes below.');
      return;
    }

    const textToUse =
      activeTab === 'upload'
        ? uploadedFile?.text || `Study material from file: ${uploadedFile?.name || 'Uploaded File'}`
        : pastedText.trim();

    setStep('generating');
    setGenerationError(null);
    setReviewError(null);

    if (!isOnline) {
      const offlineQs = generateOfflineQuestions(textToUse, questionCount, selectedTypes, difficulty);
      setGeneratedQuestions(offlineQs);
      setGenerationSource('offline_parser');
      setStep('review');
      return;
    }

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialText: textToUse,
          fileBase64: activeTab === 'upload' ? uploadedFile?.base64 : undefined,
          fileMimeType: activeTab === 'upload' ? uploadedFile?.mimeType : undefined,
          questionTypes: selectedTypes,
          questionCount,
          difficulty,
          title: quizTitle.trim() || 'Custom Study Quiz',
        }),
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
        setGeneratedQuestions(data.questions);
        setGenerationSource(data.source || 'gemini');
        if (data.quizTitle) setQuizTitle(data.quizTitle);
        setStep('review');
      } else {
        throw new Error(data.error || 'Failed to parse generated questions');
      }
    } catch {
      const offlineQs = generateOfflineQuestions(textToUse, questionCount, selectedTypes, difficulty);
      setGeneratedQuestions(offlineQs);
      setGenerationSource('offline_parser');
      setStep('review');
    }
  };

  const resolveSourceType = (): StudyMaterialSourceType => {
    if (activeTab === 'upload' && uploadedFile) {
      const lowerName = uploadedFile.name.toLowerCase();
      if (uploadedFile.mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
      if (uploadedFile.mimeType?.startsWith('image/')) return 'image';
      if (lowerName.endsWith('.docx')) return 'docx';
      return 'txt';
    }
    return 'notes';
  };

  const handleSaveToQuizzes = (launchMode?: 'solo' | 'challenge') => {
    if (isSavingQuiz) return;

    const cleanTitle = quizTitle.trim();
    if (!cleanTitle) {
      setReviewError('Please enter a quiz title before saving.');
      return;
    }
    if (generatedQuestions.length === 0) {
      setReviewError('At least one question is required.');
      return;
    }

    const sanitizedQuestions: Question[] = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const q = generatedQuestions[i];
      const prompt = q.question.trim();
      const answer = q.correctAnswer.trim();
      if (!prompt || !answer) {
        setReviewError(`Question ${i + 1} needs both a prompt and a correct answer.`);
        return;
      }
      if (q.type === 'multiple_choice') {
        const cleanOptions = (q.options || []).map((o) => o.trim()).filter(Boolean);
        if (cleanOptions.length < 2) {
          setReviewError(`Question ${i + 1} (Multiple Choice) needs at least 2 non-empty options.`);
          return;
        }
        const matchedOption = cleanOptions.find((o) => o.toLowerCase() === answer.toLowerCase());
        if (!matchedOption) {
          setReviewError(`Question ${i + 1}: select one of the options as the correct answer.`);
          return;
        }
        sanitizedQuestions.push({
          ...q,
          question: prompt,
          options: cleanOptions,
          correctAnswer: matchedOption,
          explanation: (q.explanation || '').trim(),
        });
      } else {
        sanitizedQuestions.push({
          ...q,
          question: prompt,
          options: [],
          correctAnswer: answer,
          explanation: (q.explanation || '').trim(),
        });
      }
    }

    setReviewError(null);
    setIsSavingQuiz(true);

    const today = new Date().toISOString().split('T')[0];
    const newQuizId = `quiz-${Date.now()}`;
    const materialId = reusedMaterialId || `mat-${Date.now()}`;
    const sourceText =
      activeTab === 'upload' && uploadedFile?.text
        ? uploadedFile.text
        : pastedText.trim() || undefined;

    const materialToSave: StudyMaterial = {
      id: materialId,
      quizId: newQuizId,
      title: cleanTitle,
      sourceType: resolveSourceType(),
      fileName: activeTab === 'upload' ? uploadedFile?.name : undefined,
      fileSize: activeTab === 'upload' ? uploadedFile?.size : undefined,
      mimeType: activeTab === 'upload' ? uploadedFile?.mimeType : undefined,
      textContent: sourceText,
      fileDataUrl: activeTab === 'upload' ? uploadedFile?.base64 : undefined,
      createdAt: today,
      updatedAt: today,
    };

    saveStudyMaterial(materialToSave);

    const newQuiz: Quiz = {
      id: newQuizId,
      title: cleanTitle,
      description: `Generated from ${uploadedFile ? uploadedFile.name : 'study notes'} • ${selectedTypes.length} question types.`,
      category: 'Study Review',
      difficulty,
      questions: sanitizedQuestions,
      createdAt: today,
      updatedAt: today,
      timesPlayed: 0,
      studyMaterialId: materialId,
      studyMaterialSummary: uploadedFile
        ? `File: ${uploadedFile.name} (${uploadedFile.size})`
        : (sourceText || '').slice(0, 110),
    };

    saveQuiz(newQuiz);

    if (launchMode === 'solo') {
      startGame(newQuiz, 'solo');
    } else if (launchMode === 'challenge') {
      setSelectedQuizForChallenge(newQuiz);
      setActiveTab('challenge');
      setActiveScreen('main');
    } else {
      setActiveScreen('main');
      setActiveTab('quizzes');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Top back navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b border-[#EBE7DF]">
        <button
          type="button"
          onClick={() => setActiveScreen('main')}
          className="flex items-center gap-2 text-xs font-bold text-[#202B3C]/70 hover:text-[#172337] transition-colors cursor-pointer py-1"
        >
          <ArrowLeft size={16} /> Back to Study Space
        </button>
        <span className="text-xs font-bold text-[#F47A18] uppercase tracking-wider">
          Quiz Generation Studio
        </span>
      </div>

      {/* STEP 1: MATERIAL INPUT & CONFIGURATION */}
      {step === 'input' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-extrabold text-[#172337] tracking-tight font-['Outfit']">
              Generate quiz from study material
            </h2>
            <p className="text-sm text-[#202B3C]/70 mt-1">
              Upload your lecture notes, documents, textbook captures, or paste summaries to generate tailored active recall questions.
            </p>
          </div>

          {generationError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Title Input */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#EBE7DF] shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1.5">
                Quiz Title or Subject
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="e.g. Operating Systems Chapter 4, Biology Cells..."
                className="w-full px-4 py-3 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] font-semibold focus:outline-none focus:border-[#F47A18]"
              />
            </div>

            {/* Input Method Tabs */}
            <div>
              <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-[#F0EEE9]">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('upload')}
                  className={`py-2 px-3.5 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'upload'
                      ? 'bg-[#172337] text-white shadow-xs'
                      : 'bg-[#F7F4EF] text-[#202B3C]/70 hover:bg-[#E8E4DC]'
                  }`}
                >
                  <Upload size={14} />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabMode('paste')}
                  className={`py-2 px-3.5 sm:px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'paste'
                      ? 'bg-[#172337] text-white shadow-xs'
                      : 'bg-[#F7F4EF] text-[#202B3C]/70 hover:bg-[#E8E4DC]'
                  }`}
                >
                  <FileText size={14} />
                  <span>Paste Notes</span>
                </button>
              </div>

              {/* UPLOAD TAB */}
              {activeTab === 'upload' && (
                <div className="pt-4">
                  <label className="border-2 border-dashed border-[#E8E4DC] hover:border-[#F47A18] rounded-3xl p-8 flex flex-col items-center justify-center text-center bg-[#FDFCFB] hover:bg-[#FFF0E3]/30 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-14 h-14 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center mb-3">
                      <Upload size={28} />
                    </div>
                    <p className="text-sm font-bold text-[#172337]">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-[#202B3C]/60 mt-1 max-w-sm">
                      PDF, Word documents (.docx), plain text (.txt), or photo captures of notes (PNG, JPG)
                    </p>
                  </label>

                  {uploadedFile && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-[#FFF0E3] border border-[#F47A18]/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileCheck size={20} className="text-[#F47A18] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#172337] truncate">{uploadedFile.name}</p>
                          <p className="text-[11px] text-[#202B3C]/60">{uploadedFile.size} • Ready for generation</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-[#202B3C]/50 hover:text-red-600 text-xs font-bold shrink-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* PASTE NOTES TAB */}
              {activeTab === 'paste' && (
                <div className="pt-4 space-y-3">
                  <textarea
                    rows={6}
                    value={pastedText}
                    onChange={(e) => {
                      setPastedText(e.target.value);
                      if (generationError) setGenerationError(null);
                    }}
                    placeholder="Paste textbook excerpts, lecture transcript, definitions, or study notes here..."
                    className="w-full p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] focus:outline-none focus:border-[#F47A18]"
                  />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#202B3C]/60 mr-2">
                      Or load sample study notes:
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {sampleNotes.map((sn, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPastedText(sn.text);
                            setQuizTitle(sn.title);
                            if (generationError) setGenerationError(null);
                          }}
                          className="py-1 px-3 rounded-lg bg-[#F0EEE9] hover:bg-[#FFF0E3] hover:text-[#F47A18] text-xs font-medium text-[#202B3C] transition-colors cursor-pointer"
                        >
                          {sn.title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* QUESTION TYPES & SETTINGS */}
          <div className="bg-white rounded-3xl p-4 sm:p-6 border border-[#EBE7DF] shadow-xs space-y-5">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider">
                  Select Question Types ({selectedTypes.length}/{QUESTION_TYPE_OPTIONS.length})
                </label>
                <button
                  type="button"
                  onClick={handleToggleSelectAllTypes}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    allTypesSelected
                      ? 'bg-[#172337] text-white'
                      : 'bg-[#FFF0E3] text-[#F47A18] hover:bg-[#ffe3cc]'
                  }`}
                >
                  <CheckSquare size={13} />
                  <span>{allTypesSelected ? 'Reset Default' : 'Select All (3)'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                {QUESTION_TYPE_OPTIONS.map((typeItem) => {
                  const isSelected = selectedTypes.includes(typeItem.id);
                  return (
                    <button
                      key={typeItem.id}
                      type="button"
                      onClick={() => toggleQuestionType(typeItem.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF0E3] border-[#F47A18] text-[#172337] shadow-xs ring-1 ring-[#F47A18]/20'
                          : 'bg-[#F7F4EF] border-[#E8E4DC] text-[#202B3C]/70 hover:bg-[#F0EEE9]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-bold">{typeItem.label}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                            isSelected ? 'bg-[#F47A18] text-white' : 'border border-[#C8C2B8]'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-[10px] text-[#202B3C]/60 leading-tight">
                        {typeItem.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Questions Count & Difficulty */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pt-3 border-t border-[#F0EEE9]">
              <div className="lg:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#172337] uppercase tracking-wider">
                    Number of Questions: {questionCount}
                  </label>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {QUESTION_COUNT_OPTIONS.map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        questionCount === count
                          ? 'bg-[#172337] text-white shadow-xs'
                          : 'bg-[#F7F4EF] text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                      }`}
                    >
                      {count} Qs
                    </button>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1.5">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        difficulty === level
                          ? 'bg-[#F47A18] text-white shadow-xs'
                          : 'bg-[#F7F4EF] text-[#202B3C]/70 border border-[#E8E4DC] hover:bg-[#F0EEE9]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          {!isOnline && (
            <div className="p-3.5 rounded-2xl bg-[#FFF0E3] border border-[#F47A18]/30 text-[#172337] text-xs font-medium flex items-center gap-2.5">
              <WifiOff size={16} className="text-[#F47A18] shrink-0" />
              <span>
                You are currently offline. Quizian will generate questions locally from your notes and save both your quiz and study material to offline storage.
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            className="w-full py-4 px-6 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-extrabold text-base shadow-lg shadow-[#F47A18]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={20} />
            <span>{isOnline ? 'Generate Quiz with Gemini AI' : 'Generate Quiz Offline from Notes'}</span>
          </button>
        </div>
      )}

      {/* STEP 2: GENERATION LOADING SPINNER */}
      {step === 'generating' && (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-[#EBE7DF] shadow-md my-8 space-y-5 animate-fade-in">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#FFF0E3]" />
            <div className="absolute inset-0 rounded-full border-4 border-t-[#F47A18] border-r-[#F47A18]/40 border-b-transparent border-l-transparent animate-spin" />
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center">
              <Sparkles size={24} />
            </div>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-bold text-[#172337] font-['Outfit']">
              Analyzing your study material...
            </h3>
            <p className="text-xs md:text-sm text-[#202B3C]/70 max-w-md mx-auto leading-relaxed">
              Quizian is synthesizing key definitions, formulating unique items across {selectedTypes.length} question types, and tailoring {questionCount} {difficulty.toLowerCase()} questions based on your notes.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-[#F47A18]">
            <Loader2 size={16} className="animate-spin" />
            <span>{isOnline ? 'Crafting questions with Gemini AI...' : 'Running Offline Study Parser...'}</span>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW, EDIT & SAVE */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#EBE7DF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#239B70]/10 text-[#239B70] text-xs font-bold mb-2">
                <CheckCircle2 size={14} />
                <span>
                  {generationSource === 'gemini'
                    ? 'Gemini AI Generated'
                    : generationSource === 'offline_parser'
                    ? 'Offline Study Parser Generated'
                    : 'Study Parser Generated'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#172337] font-['Outfit']">
                Review &amp; Edit Generated Questions ({generatedQuestions.length})
              </h2>
              <p className="text-xs text-[#202B3C]/70 mt-0.5">
                Review, edit question text, modify answers, or add new questions before saving.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="py-2 px-3.5 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C] cursor-pointer"
              >
                Regenerate
              </button>
              <button
                type="button"
                disabled={isSavingQuiz}
                onClick={() => handleSaveToQuizzes()}
                className="py-2.5 px-5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-60"
              >
                Save to My Quizzes
              </button>
            </div>
          </div>

          {reviewError && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{reviewError}</span>
            </div>
          )}

          {/* Generated Questions List for Review */}
          <div className="space-y-4">
            {generatedQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white rounded-3xl p-4 sm:p-5 border border-[#EBE7DF] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#FFF0E3] text-[#F47A18] text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
                      {formatQuestionTypeLabel(q.type)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (generatedQuestions.length <= 1) return;
                      setGeneratedQuestions((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-[#202B3C]/40 hover:text-red-600 transition-colors cursor-pointer"
                    title="Delete question"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Editable Question Text */}
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => {
                    const text = e.target.value;
                    setGeneratedQuestions((prev) => {
                      const copy = [...prev];
                      copy[idx] = { ...copy[idx], question: text };
                      return copy;
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm font-bold text-[#172337] focus:outline-none focus:border-[#F47A18]"
                />

                {/* Multiple Choice */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-[#202B3C]/60 uppercase">
                      Select radio for correct answer:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options?.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all ${
                            opt === q.correctAnswer
                              ? 'bg-[#239B70]/10 border-[#239B70]'
                              : 'bg-white border-[#E8E4DC]'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`gen-correct-${idx}`}
                            checked={opt === q.correctAnswer}
                            onChange={() => {
                              setGeneratedQuestions((prev) => {
                                const copy = [...prev];
                                copy[idx] = { ...copy[idx], correctAnswer: opt };
                                return copy;
                              });
                            }}
                            className="text-[#239B70] focus:ring-[#239B70]"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGeneratedQuestions((prev) => {
                                const copy = [...prev];
                                const opts = [...copy[idx].options];
                                const oldVal = opts[oIdx];
                                opts[oIdx] = val;
                                copy[idx] = {
                                  ...copy[idx],
                                  options: opts,
                                  correctAnswer:
                                    copy[idx].correctAnswer === oldVal ? val : copy[idx].correctAnswer,
                                };
                                return copy;
                              });
                            }}
                            className="w-full text-xs text-[#202B3C] border-none bg-transparent focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Identification / Scrambled Word */}
                {(q.type === 'identification' || q.type === 'scrambled_word') && (
                  <div>
                    <label className="text-[11px] font-bold text-[#202B3C]/60 uppercase block mb-1">
                      Correct Answer:
                    </label>
                    <input
                      type="text"
                      value={q.correctAnswer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setGeneratedQuestions((prev) => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], correctAnswer: val };
                          return copy;
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#239B70] text-xs font-bold text-[#239B70] focus:outline-none"
                    />
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setGeneratedQuestions((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], explanation: val };
                        return copy;
                      });
                    }}
                    placeholder="Short explanation of the concept..."
                    className="w-full px-3 py-1.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-xs text-[#202B3C]/70 focus:outline-none focus:border-[#F47A18]"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Add Question Button */}
          <button
            type="button"
            onClick={() => {
              const newQ: Question = {
                id: `q-${Date.now()}`,
                type: 'multiple_choice',
                question: 'Custom Study Question',
                options: ['Choice A', 'Choice B', 'Choice C', 'Choice D'],
                correctAnswer: 'Choice A',
                explanation: 'Explanation for study reference.',
              };
              setGeneratedQuestions((prev) => [...prev, newQ]);
            }}
            className="w-full py-3 rounded-2xl bg-white border border-dashed border-[#E8E4DC] hover:border-[#F47A18] text-xs font-bold text-[#202B3C]/70 hover:text-[#F47A18] flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Plus size={16} /> Add Custom Question
          </button>

          {/* Bottom Dual Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              type="button"
              disabled={isSavingQuiz}
              onClick={() => handleSaveToQuizzes()}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white border border-[#E8E4DC] hover:bg-[#F7F4EF] text-[#172337] font-bold text-sm transition-all cursor-pointer disabled:opacity-60"
            >
              Save to My Quizzes
            </button>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={isSavingQuiz}
                onClick={() => handleSaveToQuizzes('solo')}
                className="py-3.5 px-5 rounded-2xl bg-[#FFF0E3] hover:bg-[#ffe3cc] text-[#F47A18] font-bold text-sm transition-all cursor-pointer disabled:opacity-60"
              >
                Save &amp; Practice Solo
              </button>
              <button
                type="button"
                disabled={isSavingQuiz}
                onClick={() => handleSaveToQuizzes('challenge')}
                className="py-3.5 px-6 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all cursor-pointer disabled:opacity-60"
              >
                Save &amp; Challenge Friends
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
