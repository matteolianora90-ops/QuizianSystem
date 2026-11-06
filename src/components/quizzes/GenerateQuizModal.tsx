import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Question, QuestionType, DifficultyLevel, Quiz } from '../../types';
import { 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  Trash2, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  X,
  FileCheck,
  Edit2
} from 'lucide-react';

export const GenerateQuizModal: React.FC = () => {
  const { setActiveScreen, saveQuiz, startGame, setSelectedQuizForChallenge, setActiveTab } = useApp();

  // Workflow steps: 'input' | 'generating' | 'review'
  const [step, setStep] = useState<'input' | 'generating' | 'review'>('input');

  // Input state
  const [activeTab, setActiveTabMode] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; text?: string; base64?: string; mimeType?: string } | null>(null);
  const [quizTitle, setQuizTitle] = useState('Operating Systems & Concurrency');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(5);

  // Selected question types (multi-select)
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([
    'multiple_choice',
    'fill_blank',
    'identification',
  ]);

  // Generation status
  const [generationSource, setGenerationSource] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Generated questions for review
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = `${(file.size / 1024).toFixed(1)} KB`;
    const reader = new FileReader();

    if (file.type.startsWith('image/')) {
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setUploadedFile({
          name: file.name,
          size: sizeStr,
          base64,
          mimeType: file.type,
        });
        setQuizTitle(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setUploadedFile({
          name: file.name,
          size: sizeStr,
          text: text.slice(0, 5000), // generous sample
        });
        setQuizTitle(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsText(file);
    }
  };

  const toggleQuestionType = (type: QuestionType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev; // keep at least one
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  const handleGenerate = async () => {
    const textToUse = activeTab === 'upload' && uploadedFile?.text 
      ? uploadedFile.text 
      : pastedText.trim() || sampleNotes[0].text;

    setStep('generating');
    setGenerationError(null);

    try {
      const response = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialText: textToUse,
          imageBase64: uploadedFile?.base64,
          imageMimeType: uploadedFile?.mimeType,
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
    } catch (err: any) {
      console.error('Generation error:', err);
      setGenerationError(err?.message || 'Error communicating with generation service');
      setStep('input');
    }
  };

  const handleSaveToQuizzes = (launchMode?: 'solo' | 'challenge') => {
    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}`,
      title: quizTitle.trim() || 'Generated Quiz',
      description: `Generated from ${uploadedFile ? uploadedFile.name : 'study notes'} • ${selectedTypes.length} question types.`,
      category: 'Study Review',
      difficulty,
      questions: generatedQuestions,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      timesPlayed: 0,
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
    <div className="max-w-4xl mx-auto pb-20 md:pb-8">
      {/* Top back navigation */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EBE7DF]">
        <button
          onClick={() => setActiveScreen('main')}
          className="flex items-center gap-2 text-xs font-bold text-[#202B3C]/70 hover:text-[#172337] transition-colors"
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
          <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-4">
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
              <div className="flex items-center gap-2 pb-3 border-b border-[#F0EEE9]">
                <button
                  type="button"
                  onClick={() => setActiveTabMode('upload')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'upload'
                      ? 'bg-[#172337] text-white shadow-xs'
                      : 'bg-[#F7F4EF] text-[#202B3C]/70 hover:bg-[#E8E4DC]'
                  }`}
                >
                  <Upload size={14} />
                  <span>Upload Files (PDF, DOCX, TXT, Image)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTabMode('paste')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === 'paste'
                      ? 'bg-[#172337] text-white shadow-xs'
                      : 'bg-[#F7F4EF] text-[#202B3C]/70 hover:bg-[#E8E4DC]'
                  }`}
                >
                  <FileText size={14} />
                  <span>Paste Study Notes</span>
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
                    <div className="mt-3 p-3.5 rounded-2xl bg-[#FFF0E3] border border-[#F47A18]/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileCheck size={20} className="text-[#F47A18]" />
                        <div>
                          <p className="text-xs font-bold text-[#172337]">{uploadedFile.name}</p>
                          <p className="text-[11px] text-[#202B3C]/60">{uploadedFile.size} • Ready for generation</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setUploadedFile(null)}
                        className="text-[#202B3C]/50 hover:text-red-600 text-xs font-bold"
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
                    onChange={(e) => setPastedText(e.target.value)}
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
                          }}
                          className="py-1 px-3 rounded-lg bg-[#F0EEE9] hover:bg-[#FFF0E3] hover:text-[#F47A18] text-xs font-medium text-[#202B3C] transition-colors"
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
          <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-2">
                Select Question Types (Select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'multiple_choice' as QuestionType, label: 'Multiple Choice', desc: '4 choices with 1 correct' },
                  { id: 'fill_blank' as QuestionType, label: 'Fill in the Blanks', desc: 'Missing keyword tests' },
                  { id: 'identification' as QuestionType, label: 'Identification', desc: 'Concept definition recall' },
                  { id: 'scrambled_word' as QuestionType, label: 'Scrambled Words', desc: 'Anagram terminology solve' },
                ].map((typeItem) => {
                  const isSelected = selectedTypes.includes(typeItem.id);
                  return (
                    <button
                      key={typeItem.id}
                      type="button"
                      onClick={() => toggleQuestionType(typeItem.id)}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF0E3] border-[#F47A18] text-[#172337] shadow-xs'
                          : 'bg-[#F7F4EF] border-[#E8E4DC] text-[#202B3C]/70 hover:bg-[#F0EEE9]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{typeItem.label}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F0EEE9]">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#172337] uppercase tracking-wider">
                    Number of Questions: {questionCount}
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 8, 10, 15].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setQuestionCount(count)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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

              <div>
                <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1.5">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Easy', 'Medium', 'Hard'] as DifficultyLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setDifficulty(level)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
          <button
            onClick={handleGenerate}
            className="w-full py-4 px-6 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-extrabold text-base shadow-lg shadow-[#F47A18]/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles size={20} />
            <span>Generate Quiz with Gemini AI</span>
          </button>
        </div>
      )}

      {/* STEP 2: GENERATION LOADING SPINNER */}
      {step === 'generating' && (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#EBE7DF] shadow-md my-8 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center mx-auto animate-pulse">
            <Sparkles size={32} className="animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-[#172337] font-['Outfit']">
            Analyzing your study material...
          </h3>
          <p className="text-xs md:text-sm text-[#202B3C]/70 max-w-md mx-auto leading-relaxed">
            Quizian is synthesizing key definitions, formulating plausible distractors, and tailoring {questionCount} questions based on your notes.
          </p>
          <div className="pt-4 flex items-center justify-center gap-2 text-xs font-semibold text-[#F47A18]">
            <Loader2 size={16} className="animate-spin" />
            <span>Processing via Google Gemini 3.8 Flash...</span>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW, EDIT & SAVE */}
      {step === 'review' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#EBE7DF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#239B70]/10 text-[#239B70] text-xs font-bold mb-2">
                <CheckCircle2 size={14} />
                <span>
                  {generationSource === 'gemini' ? 'Gemini 3.8 Flash AI Generated' : 'Study Parser Generated'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#172337] font-['Outfit']">
                Review & Edit Generated Questions ({generatedQuestions.length})
              </h2>
              <p className="text-xs text-[#202B3C]/70 mt-0.5">
                Review, edit question text, modify answers, or add new questions before saving.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setStep('input')}
                className="py-2 px-3.5 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C]"
              >
                Regenerate
              </button>
              <button
                onClick={() => handleSaveToQuizzes()}
                className="py-2.5 px-5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save to My Quizzes
              </button>
            </div>
          </div>

          {/* Generated Questions List for Review */}
          <div className="space-y-4">
            {generatedQuestions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="bg-white rounded-3xl p-5 border border-[#EBE7DF] shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#FFF0E3] text-[#F47A18] text-xs font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#172337]/60">
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (generatedQuestions.length <= 1) return;
                      setGeneratedQuestions((prev) => prev.filter((_, i) => i !== idx));
                    }}
                    className="text-[#202B3C]/40 hover:text-red-600 transition-colors"
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

                {/* Options for Multiple Choice */}
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
                                copy[idx].options = opts;
                                if (copy[idx].correctAnswer === oldVal) {
                                  copy[idx].correctAnswer = val;
                                }
                                return copy;
                              });
                            }}
                            className="w-full text-xs text-[#202B3C] border-none focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Non-multiple choice correct answer input */}
                {q.type !== 'multiple_choice' && (
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
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => handleSaveToQuizzes()}
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-white border border-[#E8E4DC] hover:bg-[#F7F4EF] text-[#172337] font-bold text-sm transition-all"
            >
              Save to My Quizzes
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleSaveToQuizzes('solo')}
                className="flex-1 sm:flex-initial py-3.5 px-5 rounded-2xl bg-[#FFF0E3] hover:bg-[#ffe3cc] text-[#F47A18] font-bold text-sm transition-all"
              >
                Save & Practice Solo
              </button>
              <button
                onClick={() => handleSaveToQuizzes('challenge')}
                className="flex-1 sm:flex-initial py-3.5 px-6 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/25 transition-all"
              >
                Save & Challenge Friends
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
