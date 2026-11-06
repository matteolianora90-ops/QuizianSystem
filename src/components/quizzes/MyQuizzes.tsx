import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { Quiz, Question } from '../../types';
import { 
  Search, 
  Plus, 
  Play, 
  Eye, 
  Edit3, 
  Trash2, 
  Swords, 
  Sparkles, 
  Check, 
  X, 
  HelpCircle,
  FileQuestion,
  Filter
} from 'lucide-react';

export const MyQuizzes: React.FC = () => {
  const { 
    quizzes, 
    deleteQuiz, 
    setActiveScreen, 
    startGame, 
    setSelectedQuizForChallenge, 
    setActiveTab, 
    previewQuiz, 
    setPreviewQuiz,
    editingQuiz,
    setEditingQuiz,
    saveQuiz
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);

  // Filter quizzes
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = 
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = selectedDifficulty === 'All' || quiz.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  const handleChallengeLaunch = (quiz: Quiz) => {
    setSelectedQuizForChallenge(quiz);
    setActiveTab('challenge');
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header */}
      <Header
        title="Create and manage your quizzes"
        subtitle="Turn study materials into interactive quizzes, customize questions, or challenge peers."
        actionButton={
          <button
            onClick={() => setActiveScreen('generate')}
            className="py-2.5 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Sparkles size={16} />
            <span>+ Generate Quiz</span>
          </button>
        }
      />

      {/* Prominent Generate CTA Banner */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-[#EBE7DF] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-base md:text-lg text-[#172337] font-['Outfit']">
              Generate quiz from study material
            </h3>
            <p className="text-xs md:text-sm text-[#202B3C]/70">
              Upload PDF, DOCX, TXT files, images, or paste notes to automatically generate questions.
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveScreen('generate')}
          className="w-full md:w-auto py-3 px-6 rounded-2xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-sm shadow-md shadow-[#F47A18]/20 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <span>Start Generation</span>
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#202B3C]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search saved quizzes by title or keyword..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E8E4DC] text-sm text-[#202B3C] placeholder-[#202B3C]/40 focus:outline-none focus:border-[#F47A18]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#202B3C]/40 hover:text-[#172337]"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Difficulty Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['All', 'Easy', 'Medium', 'Hard'].map((diff) => (
            <button
              key={diff}
              onClick={() => setSelectedDifficulty(diff)}
              className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedDifficulty === diff
                  ? 'bg-[#172337] text-white shadow-xs'
                  : 'bg-white text-[#202B3C]/70 hover:bg-[#F0EEE9] border border-[#E8E4DC]'
              }`}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* SAVED QUIZZES LIST */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
            My Saved Quizzes ({filteredQuizzes.length})
          </h2>
        </div>

        {filteredQuizzes.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-[#EBE7DF]">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center mx-auto mb-3">
              <FileQuestion size={24} />
            </div>
            <h4 className="font-bold text-base text-[#172337]">No quizzes found</h4>
            <p className="text-xs text-[#202B3C]/60 mt-1 mb-4">
              {searchQuery ? `No saved quiz matches "${searchQuery}"` : 'You have not created any quizzes yet.'}
            </p>
            <button
              onClick={() => setActiveScreen('generate')}
              className="py-2.5 px-5 rounded-xl bg-[#F47A18] text-white text-xs font-bold hover:bg-[#e0690f] transition-colors"
            >
              + Generate Your First Quiz
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="bg-white rounded-3xl p-5 border border-[#EBE7DF] hover:border-[#F47A18]/40 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFF0E3] text-[#F47A18] font-bold text-lg flex items-center justify-center shrink-0 shadow-xs">
                      Q
                    </div>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                        quiz.difficulty === 'Easy'
                          ? 'bg-emerald-50 text-emerald-700'
                          : quiz.difficulty === 'Hard'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {quiz.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[#172337] group-hover:text-[#F47A18] transition-colors line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-[#202B3C]/60 mt-1 line-clamp-2 leading-relaxed">
                    {quiz.description || 'Custom interactive quiz created with Quizian.'}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-[#202B3C]/50 mt-3 pt-3 border-t border-[#F0EEE9]">
                    <span>{quiz.questions.length} questions</span>
                    <span>•</span>
                    <span>Played {quiz.timesPlayed || 0} times</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-4 mt-2 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => startGame(quiz, 'solo')}
                    className="py-2 px-3 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Play size={13} fill="currentColor" />
                    <span>Practice</span>
                  </button>
                  <button
                    onClick={() => handleChallengeLaunch(quiz)}
                    className="py-2 px-3 rounded-xl bg-[#172337] hover:bg-[#202B3C] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Swords size={13} className="text-[#F47A18]" />
                    <span>Challenge</span>
                  </button>

                  <button
                    onClick={() => setPreviewQuiz(quiz)}
                    className="py-1.5 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-semibold text-[#202B3C]/80 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Preview</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingQuiz(quiz)}
                      className="flex-1 py-1.5 px-2 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-semibold text-[#202B3C]/80 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Edit Quiz"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setQuizToDelete(quiz)}
                      className="p-1.5 rounded-xl border border-[#E8E4DC] hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-[#202B3C]/50 transition-colors cursor-pointer"
                      title="Delete Quiz"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* HOW IT WORKS SECTION (Page 2 Prototype) */}
      <div className="bg-[#FFF0E3]/70 border border-[#F47A18]/20 rounded-3xl p-5 md:p-6">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#F47A18] mb-3">
          HOW IT WORKS
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#F47A18] text-white text-xs font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <div>
              <p className="text-sm font-bold text-[#172337]">Upload notes</p>
              <p className="text-xs text-[#202B3C]/70 mt-0.5">
                Drop your PDF, lecture slides, DOCX or pasted text.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#F47A18] text-white text-xs font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <div>
              <p className="text-sm font-bold text-[#172337]">Choose question types</p>
              <p className="text-xs text-[#202B3C]/70 mt-0.5">
                Select Multiple Choice, Fill in Blanks, Identification or Scrambled Words.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#F47A18] text-white text-xs font-bold flex items-center justify-center shrink-0">
              3
            </span>
            <div>
              <p className="text-sm font-bold text-[#172337]">Review, edit & save</p>
              <p className="text-xs text-[#202B3C]/70 mt-0.5">
                Check and customize questions before studying solo or challenging friends.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewQuiz && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
            <div className="p-6 border-b border-[#F0EEE9] flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                  Quiz Preview
                </span>
                <h3 className="text-lg md:text-xl font-bold text-[#172337]">
                  {previewQuiz.title}
                </h3>
                <p className="text-xs text-[#202B3C]/60 mt-0.5">
                  {previewQuiz.questions.length} questions • {previewQuiz.difficulty} difficulty
                </p>
              </div>
              <button
                onClick={() => setPreviewQuiz(null)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {previewQuiz.questions.map((q, idx) => (
                <div key={q.id || idx} className="p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC]">
                  <div className="flex items-center justify-between text-xs font-bold text-[#202B3C]/60 mb-1.5">
                    <span>Question {idx + 1}</span>
                    <span className="uppercase text-[10px] bg-white px-2 py-0.5 rounded-md border border-[#E8E4DC]">
                      {q.type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#172337] mb-3">
                    {q.question}
                  </p>
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`p-2.5 rounded-xl text-xs font-medium border ${
                            opt === q.correctAnswer
                              ? 'bg-[#239B70]/10 border-[#239B70] text-[#239B70] font-bold'
                              : 'bg-white border-[#E8E4DC] text-[#202B3C]'
                          }`}
                        >
                          <span className="mr-1.5 font-bold">
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type !== 'multiple_choice' && (
                    <div className="p-2.5 rounded-xl text-xs font-medium bg-[#239B70]/10 border border-[#239B70] text-[#239B70] mb-2">
                      <span className="font-bold">Correct Answer:</span> {q.correctAnswer}
                    </div>
                  )}
                  {q.explanation && (
                    <p className="text-[11px] text-[#202B3C]/70 italic mt-1.5">
                      💡 {q.explanation}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-[#F0EEE9] bg-[#FAFAF8] flex items-center justify-end gap-3">
              <button
                onClick={() => setPreviewQuiz(null)}
                className="py-2 px-4 rounded-xl border border-[#E8E4DC] hover:bg-white text-xs font-bold text-[#202B3C]"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const q = previewQuiz;
                  setPreviewQuiz(null);
                  startGame(q, 'solo');
                }}
                className="py-2 px-5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold flex items-center gap-1.5"
              >
                <Play size={13} fill="currentColor" />
                <span>Practice Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT QUIZ MODAL */}
      {editingQuiz && (
        <EditQuizModal
          quiz={editingQuiz}
          onClose={() => setEditingQuiz(null)}
          onSave={(updated) => {
            saveQuiz(updated);
            setEditingQuiz(null);
          }}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#172337]">Delete Quiz?</h3>
            <p className="text-xs text-[#202B3C]/70 mt-1 mb-5">
              Are you sure you want to delete <span className="font-semibold text-[#172337]">"{quizToDelete.title}"</span>? This action cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setQuizToDelete(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteQuiz(quizToDelete.id);
                  setQuizToDelete(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Edit Quiz Modal Component
interface EditQuizModalProps {
  quiz: Quiz;
  onClose: () => void;
  onSave: (updated: Quiz) => void;
}

const EditQuizModal: React.FC<EditQuizModalProps> = ({ quiz, onClose, onSave }) => {
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description);
  const [difficulty, setDifficulty] = useState(quiz.difficulty);
  const [questions, setQuestions] = useState<Question[]>(JSON.parse(JSON.stringify(quiz.questions)));

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    setQuestions((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, value: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const opts = [...copy[qIndex].options];
      const oldVal = opts[optIndex];
      opts[optIndex] = value;
      copy[qIndex].options = opts;
      // If this was the correct answer, update it too
      if (copy[qIndex].correctAnswer === oldVal) {
        copy[qIndex].correctAnswer = value;
      }
      return copy;
    });
  };

  const handleDeleteQuestion = (index: number) => {
    if (questions.length <= 1) {
      alert('A quiz must have at least one question.');
      return;
    }
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}`,
      type: 'multiple_choice',
      question: 'New Question',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Explanation for correct answer.',
    };
    setQuestions((prev) => [...prev, newQ]);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Please enter a quiz title.');
      return;
    }
    onSave({
      ...quiz,
      title: title.trim(),
      description: description.trim(),
      difficulty,
      questions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
        <div className="p-6 border-b border-[#F0EEE9] flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
              Edit Quiz
            </span>
            <h3 className="text-xl font-bold text-[#172337]">
              Customize Questions & Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                Quiz Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] focus:outline-none focus:border-[#F47A18]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] focus:outline-none focus:border-[#F47A18]"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
                Description / Notes
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] focus:outline-none focus:border-[#F47A18]"
              />
            </div>
          </div>

          {/* Question Editor List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
                Questions ({questions.length})
              </h4>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="py-1 px-3 rounded-lg bg-[#FFF0E3] text-[#F47A18] text-xs font-bold hover:bg-[#ffe4cc] flex items-center gap-1"
              >
                <Plus size={14} /> Add Question
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={q.id || qIdx} className="p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#F47A18]">Question {qIdx + 1}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(qIdx)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>

                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => handleUpdateQuestion(qIdx, 'question', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4DC] text-sm text-[#172337] font-medium focus:outline-none focus:border-[#F47A18]"
                  placeholder="Enter question text..."
                />

                {/* Options for Multiple Choice */}
                {q.type === 'multiple_choice' && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#202B3C]/60 uppercase">
                      Choices (Click radio to set correct answer):
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-xl border border-[#E8E4DC]">
                          <input
                            type="radio"
                            name={`correct-${qIdx}`}
                            checked={q.correctAnswer === opt}
                            onChange={() => handleUpdateQuestion(qIdx, 'correctAnswer', opt)}
                            className="text-[#239B70] focus:ring-[#239B70]"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(qIdx, oIdx, e.target.value)}
                            className="w-full text-xs text-[#202B3C] border-none focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* For Fill in Blanks or Identification */}
                {q.type !== 'multiple_choice' && (
                  <div>
                    <label className="text-[11px] font-bold text-[#202B3C]/60 uppercase mb-1 block">
                      Correct Answer:
                    </label>
                    <input
                      type="text"
                      value={q.correctAnswer}
                      onChange={(e) => handleUpdateQuestion(qIdx, 'correctAnswer', e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#E8E4DC] text-xs text-[#239B70] font-bold focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    value={q.explanation || ''}
                    onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                    placeholder="Add an explanation for students..."
                    className="w-full px-3 py-1.5 rounded-xl bg-white/70 border border-[#E8E4DC] text-xs text-[#202B3C]/70 focus:outline-none focus:border-[#F47A18]"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-[#F0EEE9] bg-[#FAFAF8] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-white text-xs font-bold text-[#202B3C]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="py-2.5 px-5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
