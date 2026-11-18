import { useState, useRef } from 'react';
import { Page, ParticipantSession, ADHDDiagnosisOption, MentalizationResponses } from '../types';
import ParticipantNav from '../components/ParticipantNav';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  User,
  AlertCircle,
  Check,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import {
  QUESTIONNAIRE_INSTRUCTIONS_BN,
  QUESTIONNAIRE_OPTIONS,
  QUESTIONNAIRE_SECTIONS,
} from '../data/questionnaireData';

interface Props {
  navigate: (page: Page) => void;
  onRegister: (participant: ParticipantSession) => void;
}

function generateId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `ML-${String(num).padStart(4, '0')}`;
}

// Steps:
// 1: Consent statement & confidentiality bond
// 2: Table (ক) - নিজের ক্ষেত্রে… (Questions 1-7)
// 3: Table (খ) - অন্যদের ক্ষেত্রে… (Questions 8-10)
// 4: Table (গ) - অন্যের অবস্থান/দৃষ্টিকোণ থেকে বিবেচনা করার ক্ষেত্রে… (Questions 11-13)
// 5: Table (ঘ) - সমস্যা সমাধান করার ক্ষেত্রে… (Questions 14-18)
// 6: Participant Details (Username, Age, Gender, ADHD)
// 7: Registration Confirmation (Participant ID card)
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export default function ConsentPage({ navigate, onRegister }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [consented, setConsented] = useState(false);
  const [consentError, setConsentError] = useState(false);

  // Questionnaire responses state: questionId (1..18) -> rating (1..5)
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questionnaireError, setQuestionnaireError] = useState<string | null>(null);
  const [unansweredList, setUnansweredList] = useState<number[]>([]);

  // Participant details form state
  const [form, setForm] = useState<{
    name: string;
    age: string;
    gender: string;
    adhdDiagnosis: ADHDDiagnosisOption | '';
  }>({ name: '', age: '', gender: '', adhdDiagnosis: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedId] = useState(generateId);

  const containerRef = useRef<HTMLDivElement>(null);

  const genderOptions = ['Male', 'Female', 'Prefer not to say'];

  // Scroll to top of content on step transition
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleContinueToQuestionnaire = () => {
    if (!consented) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    setStep(2);
    scrollToTop();
  };

  const validateSection = (sectionIndex: number): boolean => {
    const section = QUESTIONNAIRE_SECTIONS[sectionIndex];
    const missing: number[] = [];
    section.questions.forEach((q) => {
      if (!answers[q.id]) {
        missing.push(q.id);
      }
    });

    if (missing.length > 0) {
      setUnansweredList(missing);
      setQuestionnaireError(
        `অনুগ্রহ করে এগিয়ে যাওয়ার আগে সকল প্রশ্নের উত্তর দিন (${missing.length}টি প্রশ্ন বাকি রয়েছে)`
      );
      return false;
    }

    setUnansweredList([]);
    setQuestionnaireError(null);
    return true;
  };

  const handleNextSection = (currentSectionIndex: number) => {
    if (!validateSection(currentSectionIndex)) return;

    if (currentSectionIndex === 0) setStep(3); // from ক to খ
    else if (currentSectionIndex === 1) setStep(4); // from খ to গ
    else if (currentSectionIndex === 2) setStep(5); // from গ to ঘ
    else if (currentSectionIndex === 3) setStep(6); // from ঘ to Details

    scrollToTop();
  };

  const handleSelectOption = (questionId: number, value: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setUnansweredList((prev) => prev.filter((id) => id !== questionId));
    if (unansweredList.length <= 1) {
      setQuestionnaireError(null);
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Username is required';
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 16 || Number(form.age) > 100)
      errs.age = 'Please enter a valid age (16–100)';
    if (!form.gender) errs.gender = 'Please select a gender option';
    if (!form.adhdDiagnosis) errs.adhdDiagnosis = 'Please select an option';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const calculateScores = (): MentalizationResponses => {
    let sectionAScore = 0;
    for (let i = 1; i <= 7; i++) sectionAScore += answers[i] || 0;

    let sectionBScore = 0;
    for (let i = 8; i <= 10; i++) sectionBScore += answers[i] || 0;

    let sectionCScore = 0;
    for (let i = 11; i <= 13; i++) sectionCScore += answers[i] || 0;

    let sectionDScore = 0;
    for (let i = 14; i <= 18; i++) sectionDScore += answers[i] || 0;

    const totalScore = sectionAScore + sectionBScore + sectionCScore + sectionDScore;

    return {
      answers,
      sectionAScore,
      sectionBScore,
      sectionCScore,
      sectionDScore,
      totalScore,
      completedAt: new Date().toISOString(),
    };
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const computedScores = calculateScores();

    const participant: ParticipantSession = {
      id: generatedId,
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      adhdDiagnosis: form.adhdDiagnosis as ADHDDiagnosisOption,
      questionnaireResponses: computedScores,
      hanoiCompleted: false,
      corsiCompleted: false,
      stroopCompleted: false,
      taskSwitchingCompleted: false,
    };
    onRegister(participant);
    setStep(7);
    scrollToTop();
  };

  const handleBegin = () => navigate('participant-dashboard');

  return (
    <div className="min-h-screen bg-[#EAF4F8] dark:bg-[#111C23] text-[#263B46] dark:text-[#EAF4F8] transition-colors duration-200">
      <ParticipantNav navigate={navigate} totalSteps={7} currentStep={step} />

      <div ref={containerRef} className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* ========================================================================= */}
        {/* Step 1: Participant Consent (Screenshot Page)                             */}
        {/* ========================================================================= */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#263B46] dark:text-[#EAF4F8] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Participant Consent
            </h1>
            <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] mb-6 sm:mb-8">
              Please read and confirm your consent before providing your details.
            </p>

            <div className="bg-white dark:bg-[#203541] rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-7 mb-5 sm:mb-6 shadow-sm">
              <h2 className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#EAF4F8] mb-3 sm:mb-4 uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                CONFIDENTIALITY BOND AND DATA PROTECTION AGREEMENT
              </h2>
              <div className="space-y-3 text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed">
                <p>
                  Thank you for taking part in this study. We want you to know how your information will be protected.
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">Your answers are confidential.</strong> We will not share anything that could identify you with anyone outside the research team.
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">We don't use your name.</strong> Your responses are linked to a code number, not your name. The list linking codes to names is kept separately and locked. (The username you will create for this purpose can always be a random word.)
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">Only the research team sees your data.</strong> Everyone on the team has agreed in writing to keep it private.
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">Your data is stored securely.</strong> All data is kept on a password-protected server.
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">Results are reported as groups.</strong> When we publish the study, we report combined results, never individual answers.
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">Recordings are deleted.</strong> If we record any interviews, the recordings are deleted after they have been transcribed, within 180 days.
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">Your data is kept for 2 years and then securely destroyed.</strong>
                </p>
                <p>
                  <strong className="text-[#263B46] dark:text-[#EAF4F8]">You can stop at any time.</strong> You can withdraw from the study, and you can ask us to delete your data.
                </p>
                <p>
                  If you have questions or concerns, please contact Mithila Tajmim [
                  <a
                    href="mailto:mithila.3702@gmail.com"
                    className="text-[#4D91AD] dark:text-[#63B8C6] underline hover:opacity-80 font-medium"
                  >
                    mithila.3702@gmail.com
                  </a>
                  ].
                </p>
                <p className="font-semibold text-[#263B46] dark:text-[#EAF4F8] pt-1">
                  By continuing, you confirm that you have read this information and agree to take part.
                </p>
              </div>
            </div>

            {/* Consent Statement Checklist */}
            <div className="bg-white dark:bg-[#203541] rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-7 mb-5 sm:mb-6 shadow-sm">
              <h2 className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#EAF4F8] mb-3 sm:mb-4 uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                Consent Statement
              </h2>
              <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed">
                {[
                  'I have read and understood the research information provided.',
                  'I understand that this study contains 4 cognitive research tasks assessing planning and problem-solving, spatial working memory, selective attention and interference control, and cognitive flexibility, and that my task responses and performance may be recorded.',
                  'I understand that participation is voluntary and I may withdraw at any time without consequence.',
                  'I understand that my data will be used for academic research purposes and handled in accordance with ethical guidelines.',
                  'I understand that this is a research study and not a diagnostic tool — my performance does not reflect my overall intelligence, cognitive ability, or health status.',
                  'I am 16 years of age or older.',
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 sm:gap-3">
                    <CheckCircle size={15} className="text-[#4D91AD] dark:text-[#63B8C6] flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consent checkbox */}
            <div
              className={`bg-white dark:bg-[#203541] rounded-xl border-2 p-4 sm:p-5 mb-5 sm:mb-6 cursor-pointer transition-all ${
                consented
                  ? 'border-[#4D91AD] dark:border-[#63B8C6] bg-[#D5E8EF]/50 dark:bg-[#192831]'
                  : consentError
                  ? 'border-[#EF4444] bg-[#FDF0EE] dark:bg-[#450A0A]/30'
                  : 'border-[#C5DCE4] dark:border-[#2D4654] hover:border-[#4D91AD] dark:hover:border-[#63B8C6]'
              }`}
              onClick={() => {
                setConsented(!consented);
                setConsentError(false);
              }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    consented
                      ? 'bg-[#4D91AD] border-[#4D91AD] dark:bg-[#63B8C6] dark:border-[#63B8C6]'
                      : 'bg-white dark:bg-[#111C23] border-[#C5DCE4] dark:border-[#2D4654]'
                  }`}
                >
                  {consented && <Check size={14} className="text-white dark:text-[#111C23]" />}
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
                    I consent to participate in this research study
                  </span>
                  <p className="text-[11px] sm:text-xs text-[#526E7B] dark:text-[#9BB5C4] mt-0.5">
                    Checking this box confirms that you have read and agree to all statements above.
                  </p>
                </div>
              </div>
            </div>

            {consentError && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-[#EF4444] mb-4">
                <AlertCircle size={15} />
                You must provide consent before continuing.
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                onClick={() => navigate('landing')}
                className="btn-ghost justify-center text-xs sm:text-sm py-2.5 cursor-pointer"
              >
                ← Back to home
              </button>
              <button
                onClick={handleContinueToQuestionnaire}
                className="btn-primary px-6 sm:px-7 py-2.5 justify-center text-xs sm:text-sm cursor-pointer"
              >
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Steps 2-5: Bangla Questionnaire Tables ((ক), (খ), (গ), (ঘ))                 */}
        {/* ========================================================================= */}
        {(step === 2 || step === 3 || step === 4 || step === 5) && (() => {
          const sectionIndex = step - 2; // 0 for ক, 1 for খ, 2 for গ, 3 for ঘ
          const section = QUESTIONNAIRE_SECTIONS[sectionIndex];
          const answeredCount = section.questions.filter((q) => answers[q.id]).length;
          const totalInSection = section.questions.length;
          const isComplete = answeredCount === totalInSection;

          return (
            <div className="animate-fade-in-up">
              {/* Top Banner / Description */}
              <div className="bg-white dark:bg-[#203541] rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-6 mb-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D5E8EF] dark:bg-[#192831] text-[#4D91AD] dark:text-[#63B8C6] text-xs font-bold tracking-wide">
                    <ClipboardList size={14} />
                    <span>প্রশ্নাবলি — পৃষ্ঠা {sectionIndex + 1} / ৪</span>
                  </div>
                  <div className="text-xs font-medium text-[#526E7B] dark:text-[#9BB5C4]">
                    অগ্রগতি: <span className="font-bold text-[#4D91AD] dark:text-[#63B8C6]">{answeredCount}</span> / {totalInSection} সম্পন্ন
                  </div>
                </div>

                <h1 className="text-xl sm:text-2xl font-extrabold text-[#263B46] dark:text-[#EAF4F8] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  {section.titleBn}
                </h1>
                <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] leading-relaxed mb-4">
                  {QUESTIONNAIRE_INSTRUCTIONS_BN}
                </p>

                {/* Visual Progress Bar for this section */}
                <div className="w-full bg-[#EAF4F8] dark:bg-[#111C23] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#4D91AD] dark:bg-[#63B8C6] h-full transition-all duration-300"
                    style={{ width: `${(answeredCount / totalInSection) * 100}%` }}
                  />
                </div>
              </div>

              {/* Questionnaire Form View */}
              {/* Desktop & Tablet Table View */}
              <div className="hidden sm:block overflow-hidden rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] bg-white dark:bg-[#203541] shadow-sm mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#D5E8EF]/70 dark:bg-[#192831] border-b border-[#C5DCE4] dark:border-[#2D4654]">
                      <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[#263B46] dark:text-[#EAF4F8] w-[46%]">
                        বিবৃতি / বাক্যসমূহ
                      </th>
                      {QUESTIONNAIRE_OPTIONS.map((opt) => (
                        <th
                          key={opt.value}
                          className="p-3 text-center text-xs font-bold text-[#263B46] dark:text-[#EAF4F8] w-[10.8%]"
                        >
                          <div className="font-semibold text-xs">{opt.labelBn}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#C5DCE4]/60 dark:divide-[#2D4654]/60">
                    {section.questions.map((q) => {
                      const selectedVal = answers[q.id];
                      const isMissed = unansweredList.includes(q.id);

                      return (
                        <tr
                          key={q.id}
                          className={`transition-colors ${
                            isMissed
                              ? 'bg-rose-50/60 dark:bg-rose-950/20'
                              : selectedVal
                              ? 'bg-[#EAF4F8]/40 dark:bg-[#192831]/40'
                              : 'hover:bg-slate-50 dark:hover:bg-[#192831]/20'
                          }`}
                        >
                          <td className="p-4 align-middle">
                            <div className="flex items-start gap-3">
                              <span className="font-bold text-sm text-[#4D91AD] dark:text-[#63B8C6] shrink-0 mt-0.5">
                                {q.numberBn}.
                              </span>
                              <span className="text-xs sm:text-sm text-[#263B46] dark:text-[#EAF4F8] leading-relaxed">
                                {q.textBn}
                              </span>
                            </div>
                            {isMissed && (
                              <p className="text-[11px] text-[#EF4444] mt-1.5 flex items-center gap-1 font-medium">
                                <AlertCircle size={12} /> উত্তর নির্বাচন করুন
                              </p>
                            )}
                          </td>

                          {QUESTIONNAIRE_OPTIONS.map((opt) => {
                            const isSelected = selectedVal === opt.value;
                            return (
                              <td
                                key={opt.value}
                                onClick={() => handleSelectOption(q.id, opt.value)}
                                className={`p-3 text-center align-middle cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-[#D5E8EF] dark:bg-[#192831] font-bold'
                                    : 'hover:bg-[#D5E8EF]/30 dark:hover:bg-[#192831]/30'
                                }`}
                                title={`${q.numberBn}. ${opt.labelBn}`}
                              >
                                <div className="flex items-center justify-center">
                                  <div
                                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                      isSelected
                                        ? 'border-[#4D91AD] bg-[#4D91AD] dark:border-[#63B8C6] dark:bg-[#63B8C6] shadow-xs'
                                        : 'border-[#C5DCE4] dark:border-[#2D4654] bg-white dark:bg-[#203541]'
                                    }`}
                                  >
                                    {isSelected && (
                                      <span className="w-2 h-2 rounded-full bg-white dark:bg-[#111C23]" />
                                    )}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Friendly Card View (< sm screens) */}
              <div className="sm:hidden space-y-4 mb-6">
                {section.questions.map((q) => {
                  const selectedVal = answers[q.id];
                  const isMissed = unansweredList.includes(q.id);

                  return (
                    <div
                      key={q.id}
                      className={`bg-white dark:bg-[#203541] rounded-2xl border p-4 shadow-xs transition-all ${
                        isMissed
                          ? 'border-[#EF4444] ring-2 ring-[#EF4444]/20'
                          : selectedVal
                          ? 'border-[#4D91AD] dark:border-[#63B8C6]'
                          : 'border-[#C5DCE4] dark:border-[#2D4654]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 mb-3">
                        <span className="w-6 h-6 rounded-lg bg-[#D5E8EF] dark:bg-[#192831] text-[#4D91AD] dark:text-[#63B8C6] font-bold text-xs flex items-center justify-center shrink-0">
                          {q.numberBn}
                        </span>
                        <p className="text-xs text-[#263B46] dark:text-[#EAF4F8] leading-relaxed">
                          {q.textBn}
                        </p>
                      </div>

                      {isMissed && (
                        <p className="text-[11px] text-[#EF4444] mb-2 flex items-center gap-1 font-medium">
                          <AlertCircle size={12} /> উত্তর নির্বাচন করুন
                        </p>
                      )}

                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {QUESTIONNAIRE_OPTIONS.map((opt) => {
                          const isSelected = selectedVal === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => handleSelectOption(q.id, opt.value)}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#D5E8EF] dark:bg-[#192831] border-[#4D91AD] dark:border-[#63B8C6] font-bold text-[#263B46] dark:text-[#EAF4F8]'
                                  : 'bg-white dark:bg-[#111C23] border-[#C5DCE4] dark:border-[#2D4654] text-[#526E7B] dark:text-[#9BB5C4]'
                              }`}
                            >
                              <span>{opt.labelBn}</span>
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-[#4D91AD] bg-[#4D91AD] dark:border-[#63B8C6] dark:bg-[#63B8C6]'
                                    : 'border-[#C5DCE4] dark:border-[#2D4654]'
                                }`}
                              >
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#111C23]" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Error Alert */}
              {questionnaireError && (
                <div className="bg-[#FDF0EE] dark:bg-[#450A0A]/40 border border-[#EF4444] rounded-xl p-3.5 mb-5 flex items-center gap-2.5 text-xs text-[#EF4444]">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{questionnaireError}</span>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setQuestionnaireError(null);
                    setUnansweredList([]);
                    setStep((s) => (s - 1) as Step);
                    scrollToTop();
                  }}
                  className="btn-ghost justify-center text-xs sm:text-sm py-2.5 cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  {step === 2 ? '← সম্মতি পত্র' : 'পূর্ববর্তী পৃষ্ঠা'}
                </button>

                <button
                  type="button"
                  onClick={() => handleNextSection(sectionIndex)}
                  className={`btn-primary px-6 sm:px-7 py-2.5 justify-center text-xs sm:text-sm cursor-pointer transition-all ${
                    !isComplete ? 'opacity-90' : ''
                  }`}
                >
                  <span>
                    {step === 5 ? 'সম্পূর্ণ করুন ও তথ্যাবলি পৃষ্ঠায় যান' : 'পরবর্তী পৃষ্ঠা'}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* Step 6: Registration form (Participant Details)                           */}
        {/* ========================================================================= */}
        {step === 6 && (
          <div className="max-w-2xl mx-auto animate-fade-in-up">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-3">
              <CheckCircle size={13} />
              <span>প্রশ্নাবলির ১৮টি প্রশ্ন সফলভাবে সম্পন্ন হয়েছে</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#263B46] dark:text-[#EAF4F8] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Participant Details
            </h1>
            <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] mb-6 sm:mb-8">
              Your information is used for research purposes only. A participant ID will be generated for your session.
            </p>

            <div className="bg-white dark:bg-[#203541] rounded-2xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-7 space-y-4 sm:space-y-5 shadow-sm">
              {/* Username */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#263B46] dark:text-[#EAF4F8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Username <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={form.name}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, name: e.target.value }));
                    setErrors((err) => ({ ...err, name: '' }));
                  }}
                  className={`ml-input ${errors.name ? 'error' : ''}`}
                />
                {errors.name && (
                  <p className="flex items-center gap-1.5 text-xs text-[#EF4444] mt-1.5">
                    <AlertCircle size={12} /> {errors.name}
                  </p>
                )}
              </div>

              {/* Age + Gender row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#263B46] dark:text-[#EAF4F8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                    Age <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 23"
                    value={form.age}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, age: e.target.value }));
                      setErrors((err) => ({ ...err, age: '' }));
                    }}
                    className={`ml-input ${errors.age ? 'error' : ''}`}
                    min={16}
                    max={100}
                  />
                  {errors.age && (
                    <p className="flex items-center gap-1.5 text-xs text-[#EF4444] mt-1.5">
                      <AlertCircle size={12} /> {errors.age}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-[#263B46] dark:text-[#EAF4F8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                    Gender <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, gender: e.target.value }));
                      setErrors((err) => ({ ...err, gender: '' }));
                    }}
                    className={`ml-input appearance-none ${errors.gender ? 'error' : ''}`}
                  >
                    <option value="">Select an option</option>
                    {genderOptions.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors.gender && (
                    <p className="flex items-center gap-1.5 text-xs text-[#EF4444] mt-1.5">
                      <AlertCircle size={12} /> {errors.gender}
                    </p>
                  )}
                </div>
              </div>

              {/* ADHD Diagnosis */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#263B46] dark:text-[#EAF4F8] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Are you clinically diagnosed with ADHD? <span className="text-[#EF4444]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                  ].map((opt) => {
                    const isSelected = form.adhdDiagnosis === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#4D91AD] dark:border-[#63B8C6] bg-[#D5E8EF] dark:bg-[#192831] shadow-xs'
                            : errors.adhdDiagnosis
                            ? 'border-[#EF4444]/60 bg-[#FDF0EE]/30 hover:border-[#EF4444]'
                            : 'border-[#C5DCE4] dark:border-[#2D4654] bg-white dark:bg-[#192831]/60 hover:border-[#4D91AD] dark:hover:border-[#63B8C6]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="adhdDiagnosis"
                          value={opt.value}
                          checked={isSelected}
                          onChange={() => {
                            setForm((f) => ({ ...f, adhdDiagnosis: opt.value as ADHDDiagnosisOption }));
                            setErrors((err) => ({ ...err, adhdDiagnosis: '' }));
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? 'border-[#4D91AD] bg-[#4D91AD] dark:border-[#63B8C6] dark:bg-[#63B8C6]'
                              : 'border-[#C5DCE4] dark:border-[#2D4654] bg-white dark:bg-[#203541]'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[#111C23]" />}
                        </div>
                        <span
                          className={`text-xs sm:text-sm font-semibold font-['Plus_Jakarta_Sans',sans-serif] ${
                            isSelected ? 'text-[#4D91AD] dark:text-[#63B8C6]' : 'text-[#263B46] dark:text-[#EAF4F8]'
                          }`}
                        >
                          {opt.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {errors.adhdDiagnosis && (
                  <p className="flex items-center gap-1.5 text-xs text-[#EF4444] mt-1.5">
                    <AlertCircle size={12} /> {errors.adhdDiagnosis}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setStep(5);
                  scrollToTop();
                }}
                className="btn-ghost justify-center text-xs sm:text-sm py-2.5 cursor-pointer"
              >
                ← পূর্ববর্তী (টেবিল ঘ)
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary px-6 sm:px-7 py-2.5 justify-center text-xs sm:text-sm cursor-pointer"
              >
                Create session
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* Step 7: Confirmation & Session Token Card                                 */}
        {/* ========================================================================= */}
        {step === 7 && (
          <div className="max-w-2xl mx-auto animate-pop-in text-center">
            {/* Success icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#D5E8EF] dark:bg-[#203541] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm">
              <CheckCircle size={32} className="text-[#4D91AD] dark:text-[#63B8C6] sm:w-9 sm:h-9" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#263B46] dark:text-[#EAF4F8] mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              You're registered
            </h1>
            <p className="text-xs sm:text-sm text-[#526E7B] dark:text-[#9BB5C4] mb-6 sm:mb-8">
              Your research session and questionnaire responses have been recorded. Please note your participant ID below.
            </p>

            {/* ID card */}
            <div className="bg-white dark:bg-[#203541] rounded-2xl border-2 border-[#C5DCE4] dark:border-[#2D4654] p-5 sm:p-8 max-w-sm mx-auto mb-6 sm:mb-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 justify-center">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#D5E8EF] dark:bg-[#192831] rounded-xl flex items-center justify-center">
                  <User size={18} className="text-[#4D91AD] dark:text-[#63B8C6]" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-[#526E7B] dark:text-[#9BB5C4]">Welcome,</div>
                  <div className="text-xs sm:text-sm font-bold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
                    {form.name}
                  </div>
                </div>
              </div>

              <div className="bg-[#D5E8EF] dark:bg-[#192831] rounded-xl border border-[#C5DCE4] dark:border-[#2D4654] p-4 sm:p-5 mb-4">
                <div className="text-[11px] sm:text-xs text-[#526E7B] dark:text-[#9BB5C4] mb-1.5 sm:mb-2 uppercase tracking-wider font-semibold font-['Plus_Jakarta_Sans',sans-serif]">
                  Participant ID
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[#4D91AD] dark:text-[#63B8C6] font-['JetBrains_Mono',monospace] tracking-wider">
                  {generatedId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs sm:text-sm mb-4">
                <div className="bg-[#D5E8EF] dark:bg-[#192831] rounded-lg p-2.5 sm:p-3 text-left">
                  <div className="text-xs text-[#526E7B] dark:text-[#9BB5C4] mb-0.5">Age</div>
                  <div className="font-semibold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif]">
                    {form.age}
                  </div>
                </div>
                <div className="bg-[#D5E8EF] dark:bg-[#192831] rounded-lg p-2.5 sm:p-3 text-left">
                  <div className="text-xs text-[#526E7B] dark:text-[#9BB5C4] mb-0.5">Gender</div>
                  <div className="font-semibold text-[#263B46] dark:text-[#EAF4F8] font-['Plus_Jakarta_Sans',sans-serif] truncate">
                    {form.gender}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-1.5 font-medium">
                <Sparkles size={13} />
                <span>প্রশ্নাবলি সম্পন্ন: ১৮/১৮ উত্তর সংরক্ষিত</span>
              </div>
            </div>

            <p className="text-xs text-[#526E7B] dark:text-[#9BB5C4] max-w-xs mx-auto mb-6 sm:mb-8">
              This ID identifies your research session. You may wish to note it for reference, though it is not required to complete the study.
            </p>

            <button
              onClick={handleBegin}
              className="btn-primary px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base w-full sm:w-auto justify-center cursor-pointer"
            >
              Continue to Activities
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
