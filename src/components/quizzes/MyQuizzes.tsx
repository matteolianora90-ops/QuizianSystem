import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Header } from '../common/Header';
import { Quiz, Question, StudyMaterial, StudyMaterialSourceType } from '../../types';
import { formatCorrectAnswerForDisplay, formatQuestionTypeLabel } from '../../utils/questionUtils';
import { extractDocxText } from '../../utils/docxParser';
import { getCategoryVisual } from '../../utils/categoryVisuals';
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
  FileQuestion,
  FileText,
  BookOpen,
  Image as ImageIcon,
  Download,
  Copy,
  Upload,
  CheckCircle2
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
    saveQuiz,
    studyMaterials,
    saveStudyMaterial,
    deleteStudyMaterial,
    getStudyMaterialForQuiz,
    setMaterialDraftForGeneration,
    showToast
  } = useApp();

  const [librarySection, setLibrarySection] = useState<'quizzes' | 'materials'>('quizzes');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [previewTab, setPreviewTab] = useState<'questions' | 'material'>('questions');
  const [viewingMaterial, setViewingMaterial] = useState<StudyMaterial | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<StudyMaterial | null>(null);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [copiedMaterialId, setCopiedMaterialId] = useState<string | null>(null);

  // Filter quizzes
  const filteredQuizzes = quizzes.filter((quiz) => {
    const matchesSearch = 
      quiz.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDiff = selectedDifficulty === 'All' || quiz.difficulty === selectedDifficulty;
    return matchesSearch && matchesDiff;
  });

  // Filter study materials
  const filteredMaterials = studyMaterials.filter((mat) => {
    const q = searchQuery.toLowerCase();
    return (
      mat.title.toLowerCase().includes(q) ||
      (mat.fileName || '').toLowerCase().includes(q) ||
      (mat.textContent || '').toLowerCase().includes(q)
    );
  });

  const handleChallengeLaunch = (quiz: Quiz) => {
    setSelectedQuizForChallenge(quiz);
    setActiveTab('challenge');
  };

  const handleOpenPreview = (quiz: Quiz, initialTab: 'questions' | 'material' = 'questions') => {
    setPreviewTab(initialTab);
    setPreviewQuiz(quiz);
  };

  const handleCopyMaterialText = (mat: StudyMaterial) => {
    if (!mat.textContent) return;
    navigator.clipboard?.writeText(mat.textContent).catch(() => {});
    setCopiedMaterialId(mat.id);
    showToast('Study notes copied to clipboard!');
    setTimeout(() => setCopiedMaterialId(null), 2000);
  };

  const handleGenerateFromMaterial = (mat: StudyMaterial) => {
    setMaterialDraftForGeneration(mat);
    setViewingMaterial(null);
    setActiveScreen('generate');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Header
        title="Create and manage your quizzes"
        subtitle="Turn study materials into interactive quizzes, review saved notes offline, or challenge peers."
        actionButton={
          <button
            type="button"
            onClick={() => setActiveScreen('generate')}
            className="py-2.5 px-4 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white font-bold text-xs md:text-sm flex items-center gap-2 shadow-xs transition-colors cursor-pointer whitespace-nowrap"
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
              Upload PDF, DOCX, TXT files, images, or paste notes—saved locally so you can review anytime offline.
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

      {/* Section Switcher: Saved Quizzes vs Offline Study Materials */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center bg-[#F0EEE9] p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setLibrarySection('quizzes')}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              librarySection === 'quizzes'
                ? 'bg-white text-[#172337] shadow-xs'
                : 'text-[#202B3C]/70 hover:text-[#172337]'
            }`}
          >
            <BookOpen size={14} className={librarySection === 'quizzes' ? 'text-[#F47A18]' : ''} />
            <span>Saved Quizzes ({quizzes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setLibrarySection('materials')}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              librarySection === 'materials'
                ? 'bg-white text-[#172337] shadow-xs'
                : 'text-[#202B3C]/70 hover:text-[#172337]'
            }`}
          >
            <FileText size={14} className={librarySection === 'materials' ? 'text-[#F47A18]' : ''} />
            <span>Study Materials ({studyMaterials.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#239B70] bg-[#239B70]/10 px-3 py-1.5 rounded-xl">
            <CheckCircle2 size={13} />
            <span>Cached for Offline Study</span>
          </span>
          {librarySection === 'materials' && (
            <button
              type="button"
              onClick={() => setShowAddMaterialModal(true)}
              className="py-1.5 px-3 rounded-xl bg-[#172337] hover:bg-[#202B3C] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Material</span>
            </button>
          )}
        </div>
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
            placeholder={
              librarySection === 'quizzes'
                ? 'Search saved quizzes by title or keyword...'
                : 'Search study notes, files, or keywords...'
            }
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

        {/* Difficulty Filter Chips (Quizzes view only) */}
        {librarySection === 'quizzes' && (
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
        )}
      </div>

      {/* SAVED QUIZZES LIST */}
      {librarySection === 'quizzes' && (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuizzes.map((quiz) => {
              const catVisual = getCategoryVisual(quiz.category, quiz.title);
              const CategoryIcon = catVisual.icon;
              const masteryPct = Math.min(100, (quiz.timesPlayed || 0) * 12);

              return (
              <div
                key={quiz.id}
                className="quizian-card bg-white rounded-3xl p-5 border border-[#EBE7DF] hover:border-[#F47A18]/45 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className={`w-11 h-11 rounded-2xl ${catVisual.bgClass} ${catVisual.textClass} border ${catVisual.borderClass} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                      <CategoryIcon size={21} />
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        quiz.difficulty === 'Easy'
                          ? 'text-[#239B70]'
                          : quiz.difficulty === 'Hard'
                          ? 'text-[#F47A18]'
                          : 'text-[#172337]'
                      }`}
                    >
                      {quiz.difficulty}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[#172337] group-hover:text-[#F47A18] transition-colors line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-[#202B3C]/65 mt-1 line-clamp-2 leading-relaxed">
                    {quiz.description || 'Custom interactive quiz created with Quizian.'}
                  </p>

                  <div className="mt-3.5 pt-3 border-t border-[#F0EEE9] space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs text-[#202B3C]/60 tabular-nums">
                      <span className="truncate">{catVisual.label} · {quiz.questions.length} questions</span>
                      <span className="shrink-0 font-semibold">Played {quiz.timesPlayed || 0}×</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#F7F4EF] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#F47A18] to-[#239B70] transition-all duration-300"
                        style={{ width: `${Math.max(8, masteryPct)}%` }}
                      />
                    </div>
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
                    onClick={() => handleOpenPreview(quiz, 'questions')}
                    className="py-1.5 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-semibold text-[#202B3C]/80 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye size={13} />
                    <span>Preview</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {getStudyMaterialForQuiz(quiz) && (
                      <button
                        onClick={() => handleOpenPreview(quiz, 'material')}
                        className="p-1.5 rounded-xl border border-[#E8E4DC] hover:bg-[#FFF0E3] hover:text-[#F47A18] hover:border-[#F47A18]/30 text-[#202B3C]/70 transition-colors cursor-pointer"
                        title="View Saved Study Material"
                      >
                        <FileText size={13} />
                      </button>
                    )}
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
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* OFFLINE STUDY MATERIALS LIBRARY */}
      {librarySection === 'materials' && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#172337]/70">
              Saved Study Materials ({filteredMaterials.length})
            </h2>
          </div>

          {filteredMaterials.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-[#EBE7DF]">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center mx-auto mb-3">
                <FileText size={24} />
              </div>
              <h4 className="font-bold text-base text-[#172337]">No study materials found</h4>
              <p className="text-xs text-[#202B3C]/60 mt-1 mb-4">
                {searchQuery
                  ? `No study material matches "${searchQuery}"`
                  : 'Save lecture notes, PDFs, or textbook photos here to read offline anytime.'}
              </p>
              <button
                type="button"
                onClick={() => setShowAddMaterialModal(true)}
                className="py-2.5 px-5 rounded-xl bg-[#F47A18] text-white text-xs font-bold hover:bg-[#e0690f] transition-colors cursor-pointer"
              >
                + Save Study Material
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="bg-white rounded-3xl p-5 border border-[#EBE7DF] hover:border-[#F47A18]/40 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#FFF0E3] text-[#F47A18] flex items-center justify-center shrink-0">
                        {mat.sourceType === 'image' ? <ImageIcon size={20} /> : <FileText size={20} />}
                      </div>
                      <span className="text-[11px] px-2.5 py-1 rounded-full font-bold uppercase bg-[#F7F4EF] text-[#172337] border border-[#E8E4DC]">
                        {mat.sourceType}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-[#172337] group-hover:text-[#F47A18] transition-colors line-clamp-1">
                      {mat.title}
                    </h3>
                    <p className="text-xs text-[#202B3C]/60 mt-1 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {mat.textContent
                        ? mat.textContent
                        : mat.fileName
                        ? `Uploaded file: ${mat.fileName} (${mat.fileSize || 'Saved locally'})`
                        : 'Saved offline study document.'}
                    </p>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#202B3C]/50 mt-3 pt-3 border-t border-[#F0EEE9]">
                      <span className="truncate">{mat.fileName || 'Study Notes'}</span>
                      <span className="shrink-0">{mat.updatedAt}</span>
                    </div>
                  </div>

                  <div className="pt-4 mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingMaterial(mat)}
                      className="py-2 px-3 rounded-xl bg-[#172337] hover:bg-[#202B3C] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateFromMaterial(mat)}
                      className="py-2 px-3 rounded-xl bg-[#FFF0E3] hover:bg-[#ffe3cc] text-[#F47A18] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles size={13} />
                      <span>Make Quiz</span>
                    </button>
                    {mat.textContent && (
                      <button
                        type="button"
                        onClick={() => handleCopyMaterialText(mat)}
                        className="py-1.5 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-semibold text-[#202B3C]/80 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedMaterialId === mat.id ? <Check size={13} className="text-[#239B70]" /> : <Copy size={13} />}
                        <span>{copiedMaterialId === mat.id ? 'Copied' : 'Copy Notes'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMaterialToDelete(mat)}
                      className={`py-1.5 px-3 rounded-xl border border-[#E8E4DC] hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs font-semibold text-[#202B3C]/60 flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                        !mat.textContent ? 'col-span-2' : ''
                      }`}
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
                Mix Multiple Choice, Fill in the Blanks, Identification, and Scrambled Words.
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

      {/* PREVIEW MODAL (Questions + Linked Study Material) */}
      {previewQuiz && (() => {
        const linkedMaterial = getStudyMaterialForQuiz(previewQuiz);
        return (
          <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-[#F0EEE9] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                      Offline Quiz &amp; Study Material Preview
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
                    className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                {linkedMaterial && (
                  <div className="inline-flex items-center bg-[#F0EEE9] p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('questions')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        previewTab === 'questions'
                          ? 'bg-white text-[#172337] shadow-xs'
                          : 'text-[#202B3C]/70 hover:text-[#172337]'
                      }`}
                    >
                      Questions ({previewQuiz.questions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('material')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        previewTab === 'material'
                          ? 'bg-white text-[#172337] shadow-xs'
                          : 'text-[#202B3C]/70 hover:text-[#172337]'
                      }`}
                    >
                      <FileText size={13} className="text-[#F47A18]" />
                      <span>Study Material</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {previewTab === 'questions' || !linkedMaterial ? (
                  previewQuiz.questions.map((q, idx) => (
                    <div key={q.id || idx} className="p-4 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#202B3C]/60 mb-1.5">
                        <span>Question {idx + 1}</span>
                        <span className="uppercase text-[10px] bg-white px-2 py-0.5 rounded-md border border-[#E8E4DC]">
                          {formatQuestionTypeLabel(q.type)}
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
                                opt.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
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
                          <span className="font-bold">Correct Answer:</span> {formatCorrectAnswerForDisplay(q)}
                        </div>
                      )}
                      {q.explanation && (
                        <p className="text-[11px] text-[#202B3C]/70 italic mt-1.5">
                          💡 {q.explanation}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <StudyMaterialContent material={linkedMaterial} onCopy={() => handleCopyMaterialText(linkedMaterial)} />
                )}
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
        );
      })()}

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

      {/* VIEW STUDY MATERIAL MODAL */}
      {viewingMaterial && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90dvh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[#F0EEE9] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
                  Offline Study Material &bull; {viewingMaterial.sourceType.toUpperCase()}
                </span>
                <h3 className="text-lg md:text-xl font-bold text-[#172337] truncate">
                  {viewingMaterial.title}
                </h3>
                <p className="text-xs text-[#202B3C]/60 mt-0.5">
                  {viewingMaterial.fileName ? `${viewingMaterial.fileName} (${viewingMaterial.fileSize || 'Cached'}) • ` : ''}
                  Saved {viewingMaterial.updatedAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingMaterial(null)}
                className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <StudyMaterialContent
                material={viewingMaterial}
                onCopy={() => handleCopyMaterialText(viewingMaterial)}
              />
            </div>

            <div className="p-4 border-t border-[#F0EEE9] bg-[#FAFAF8] flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setViewingMaterial(null)}
                className="py-2 px-4 rounded-xl border border-[#E8E4DC] hover:bg-white text-xs font-bold text-[#202B3C] cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleGenerateFromMaterial(viewingMaterial)}
                className="py-2 px-5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Generate Quiz from This</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE MATERIAL CONFIRMATION MODAL */}
      {materialToDelete && (
        <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-[#172337]">Remove Study Material?</h3>
            <p className="text-xs text-[#202B3C]/70 mt-1 mb-5">
              Remove <span className="font-semibold text-[#172337]">&ldquo;{materialToDelete.title}&rdquo;</span> from offline storage? Your saved quizzes will stay intact.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMaterialToDelete(null)}
                className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteStudyMaterial(materialToDelete.id);
                  setMaterialToDelete(null);
                }}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD STANDALONE STUDY MATERIAL MODAL */}
      {showAddMaterialModal && (
        <AddStudyMaterialModal
          onClose={() => setShowAddMaterialModal(false)}
          onSave={(mat) => {
            saveStudyMaterial(mat);
            setShowAddMaterialModal(false);
            showToast(`Saved "${mat.title}" for offline access!`);
          }}
        />
      )}
    </div>
  );
};

// Reusable renderer for study material content (text notes, uploaded images, uploaded PDFs)
const StudyMaterialContent: React.FC<{ material: StudyMaterial; onCopy: () => void }> = ({ material, onCopy }) => {
  const isImage = material.sourceType === 'image' && !!material.fileDataUrl;
  const isPdf = material.sourceType === 'pdf' && !!material.fileDataUrl;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#239B70] bg-[#239B70]/10 px-3 py-1 rounded-full">
          <CheckCircle2 size={13} />
          <span>Stored locally for offline review</span>
        </span>
        <div className="flex items-center gap-2">
          {material.textContent && (
            <button
              type="button"
              onClick={onCopy}
              className="py-1.5 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#172337] flex items-center gap-1.5 cursor-pointer"
            >
              <Copy size={13} />
              <span>Copy Notes</span>
            </button>
          )}
          {material.fileDataUrl && (
            <a
              href={material.fileDataUrl}
              download={material.fileName || `${material.title}.${material.sourceType}`}
              className="py-1.5 px-3 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#172337] flex items-center gap-1.5"
            >
              <Download size={13} />
              <span>Download File</span>
            </a>
          )}
        </div>
      </div>

      {isImage && (
        <div className="rounded-2xl overflow-hidden border border-[#E8E4DC] bg-[#F7F4EF] p-2">
          <img
            src={material.fileDataUrl}
            alt={material.title}
            className="w-full max-h-[55dvh] object-contain rounded-xl mx-auto"
          />
        </div>
      )}

      {isPdf && (
        <div className="rounded-2xl overflow-hidden border border-[#E8E4DC] bg-[#F7F4EF]">
          <iframe
            src={material.fileDataUrl}
            title={material.title}
            className="w-full h-[55dvh] bg-white"
          />
        </div>
      )}

      {material.textContent && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] text-xs sm:text-sm text-[#172337] leading-relaxed whitespace-pre-wrap font-medium">
          {material.textContent}
        </div>
      )}

      {!isImage && !isPdf && !material.textContent && (
        <div className="p-6 rounded-2xl bg-[#F7F4EF] border border-[#E8E4DC] text-center text-xs text-[#202B3C]/70">
          {material.fileName
            ? `File "${material.fileName}" metadata is saved locally.`
            : 'No additional preview content available.'}
        </div>
      )}
    </div>
  );
};

// Quick Modal to save a Study Note / File directly to Offline Storage
const AddStudyMaterialModal: React.FC<{
  onClose: () => void;
  onSave: (material: StudyMaterial) => void;
}> = ({ onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [uploaded, setUploaded] = useState<{
    name: string;
    size: string;
    sourceType: StudyMaterialSourceType;
    text?: string;
    dataUrl?: string;
    mimeType?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const size = `${(file.size / 1024).toFixed(1)} KB`;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const isDocx = file.name.toLowerCase().endsWith('.docx');

    if (isPdf || isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploaded({
          name: file.name,
          size,
          sourceType: isPdf ? 'pdf' : 'image',
          dataUrl: ev.target?.result as string,
          mimeType: isPdf ? 'application/pdf' : file.type,
        });
        if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, ''));
      };
      reader.readAsDataURL(file);
    } else if (isDocx) {
      const text = await extractDocxText(file);
      setUploaded({
        name: file.name,
        size,
        sourceType: 'docx',
        text: text.slice(0, 24000),
      });
      if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    } else {
      const raw = await file.text().catch(() => '');
      setUploaded({
        name: file.name,
        size,
        sourceType: 'txt',
        text: raw.slice(0, 24000),
      });
      if (!title.trim()) setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a title for your study material.');
      return;
    }
    if (!notes.trim() && !uploaded) {
      setError('Please paste study notes or upload a file.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    onSave({
      id: `mat-${Date.now()}`,
      title: title.trim(),
      sourceType: uploaded ? uploaded.sourceType : 'notes',
      fileName: uploaded?.name,
      fileSize: uploaded?.size,
      mimeType: uploaded?.mimeType,
      textContent: notes.trim() || uploaded?.text,
      fileDataUrl: uploaded?.dataUrl,
      createdAt: today,
      updatedAt: today,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#F0EEE9] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
              Offline Study Library
            </span>
            <h3 className="text-lg font-bold text-[#172337]">Save Study Material</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
              Material Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology Chapter 5 Summary"
              className="w-full px-4 py-2.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] focus:outline-none focus:border-[#F47A18]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
              Upload File (Optional)
            </label>
            <label className="border-2 border-dashed border-[#E8E4DC] hover:border-[#F47A18] rounded-2xl p-4 flex items-center justify-center gap-2 text-xs font-bold text-[#172337] bg-[#FDFCFB] cursor-pointer">
              <input type="file" accept=".pdf,.docx,.txt,image/*" onChange={handleFile} className="hidden" />
              <Upload size={16} className="text-[#F47A18]" />
              <span>{uploaded ? `${uploaded.name} (${uploaded.size})` : 'Choose PDF, DOCX, TXT, or Image'}</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#172337] uppercase tracking-wider mb-1">
              Study Notes
            </label>
            <textarea
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste key terms, formulas, or summaries to access anytime offline..."
              className="w-full p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E8E4DC] text-sm text-[#172337] focus:outline-none focus:border-[#F47A18]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl border border-[#E8E4DC] hover:bg-[#F7F4EF] text-xs font-bold text-[#202B3C] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-[#F47A18] hover:bg-[#e0690f] text-white text-xs font-bold cursor-pointer"
            >
              Save Offline
            </button>
          </div>
        </form>
      </div>
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
  const { showToast } = useApp();
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description);
  const [difficulty, setDifficulty] = useState(quiz.difficulty);
  const [questions, setQuestions] = useState<Question[]>(JSON.parse(JSON.stringify(quiz.questions)));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
      setErrorMsg('A quiz must have at least one question.');
      showToast('A quiz must have at least one question.');
      return;
    }
    setErrorMsg(null);
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
    setErrorMsg(null);
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
      setErrorMsg('Please enter a quiz title before saving.');
      return;
    }
    setErrorMsg(null);
    onSave({
      ...quiz,
      title: title.trim(),
      description: description.trim(),
      difficulty,
      questions,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#172337]/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90dvh] flex flex-col shadow-2xl border border-[#EBE7DF] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[#F0EEE9] flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#F47A18]">
              Edit Quiz
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-[#172337]">
              Customize Questions & Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F7F4EF] hover:bg-[#E8E4DC] flex items-center justify-center text-[#202B3C]/70 cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}
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
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#F47A18]">Question {qIdx + 1}</span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-white border border-[#E8E4DC] text-[#172337]/70">
                      {formatQuestionTypeLabel(q.type)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(qIdx)}
                    className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
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

                {/* For Fill in Blanks, Identification, or Scrambled Word */}
                {(q.type === 'fill_blank' || q.type === 'identification' || q.type === 'scrambled_word') && (
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
