import { useState } from 'react';
import { Page, ParticipantSession, ADHDDiagnosisOption } from '../types';
import ParticipantNav from '../components/ParticipantNav';
import { ArrowRight, CheckCircle, User, AlertCircle, Check } from 'lucide-react';

interface Props {
  navigate: (page: Page) => void;
  onRegister: (participant: ParticipantSession) => void;
}

function generateId(): string {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `ML-${String(num).padStart(4, '0')}`;
}

export default function ConsentPage({ navigate, onRegister }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [consented, setConsented] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    age: string;
    gender: string;
    adhdDiagnosis: ADHDDiagnosisOption | '';
  }>({ name: '', age: '', gender: '', adhdDiagnosis: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedId] = useState(generateId);

  const genderOptions = ['Male', 'Female', 'Prefer not to say'];

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 16 || Number(form.age) > 100)
      errs.age = 'Please enter a valid age (16–100)';
    if (!form.gender) errs.gender = 'Please select a gender option';
    if (!form.adhdDiagnosis) errs.adhdDiagnosis = 'Please select an option';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinueToForm = () => {
    if (!consented) { setConsentError(true); return; }
    setConsentError(false);
    setStep(2);
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const participant: ParticipantSession = {
      id: generatedId,
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      adhdDiagnosis: form.adhdDiagnosis as ADHDDiagnosisOption,
      hanoiCompleted: false,
      corsiCompleted: false,
      stroopCompleted: false,
      taskSwitchingCompleted: false,
    };
    onRegister(participant);
    setStep(3);
  };

  const handleBegin = () => navigate('participant-dashboard');

  return (
    <div className="min-h-screen bg-[#F8F8FC]">
      <ParticipantNav navigate={navigate} totalSteps={3} currentStep={step} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Step 1: Consent */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11152F] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Participant Consent
            </h1>
            <p className="text-xs sm:text-sm text-[#73758C] mb-6 sm:mb-8">
              Please read and confirm your consent before providing your details.
            </p>

            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7 mb-5 sm:mb-6">
              <h2 className="text-xs sm:text-sm font-bold text-[#11152F] mb-3 sm:mb-4 uppercase tracking-wider font-['Plus_Jakarta_Sans',sans-serif]">
                Consent Statement
              </h2>
              <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-[#73758C] leading-relaxed">
                {[
                  'I have read and understood the research information provided.',
                  'I understand that this study contains 4 cognitive research tasks assessing planning and problem-solving, spatial working memory, selective attention and interference control, and cognitive flexibility, and that my task responses and performance may be recorded.',
                  'I understand that participation is voluntary and I may withdraw at any time without consequence.',
                  'I understand that my data will be used for academic research purposes and handled in accordance with ethical guidelines.',
                  'I understand that this is a research study and not a diagnostic tool — my performance does not reflect my overall intelligence, cognitive ability, or health status.',
                  'I am 16 years of age or older.',
                ].map((item, i) => (
                  <div key={i} className="flex gap-2.5 sm:gap-3">
                    <CheckCircle size={15} className="text-[#6D5AE6] flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consent checkbox */}
            <div
              className={`bg-white rounded-xl border-2 p-4 sm:p-5 mb-5 sm:mb-6 cursor-pointer transition-all ${
                consented
                  ? 'border-[#6D5AE6] bg-[#EDEAF8]'
                  : consentError
                  ? 'border-[#EF4444] bg-[#FDF0EE]'
                  : 'border-[#E9E8F2] hover:border-[#6D5AE6]'
              }`}
              onClick={() => { setConsented(!consented); setConsentError(false); }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    consented ? 'bg-[#6D5AE6] border-[#6D5AE6]' : 'bg-white border-[#D4D2E8]'
                  }`}
                >
                  {consented && <Check size={14} className="text-white" />}
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif]">
                    I consent to participate in this research study
                  </span>
                  <p className="text-[11px] sm:text-xs text-[#73758C] mt-0.5">
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
              <button onClick={() => navigate('research-info')} className="btn-ghost justify-center text-xs sm:text-sm py-2.5">
                ← Back
              </button>
              <button onClick={handleContinueToForm} className="btn-primary px-6 sm:px-7 py-2.5 justify-center text-xs sm:text-sm">
                Continue
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Registration form */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11152F] mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
              Participant Details
            </h1>
            <p className="text-xs sm:text-sm text-[#73758C] mb-6 sm:mb-8">
              Your information is used for research purposes only. A participant ID will be generated for your session.
            </p>

            <div className="bg-white rounded-2xl border border-[#E9E8F2] p-4 sm:p-7 space-y-4 sm:space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#11152F] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Full name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(err => ({ ...err, name: '' })); }}
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
                  <label className="block text-xs sm:text-sm font-semibold text-[#11152F] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                    Age <span className="text-[#EF4444]">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 23"
                    value={form.age}
                    onChange={e => { setForm(f => ({ ...f, age: e.target.value })); setErrors(err => ({ ...err, age: '' })); }}
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
                  <label className="block text-xs sm:text-sm font-semibold text-[#11152F] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                    Gender <span className="text-[#EF4444]">*</span>
                  </label>
                  <select
                    value={form.gender}
                    onChange={e => { setForm(f => ({ ...f, gender: e.target.value })); setErrors(err => ({ ...err, gender: '' })); }}
                    className={`ml-input appearance-none ${errors.gender ? 'error' : ''}`}
                  >
                    <option value="">Select an option</option>
                    {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
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
                <label className="block text-xs sm:text-sm font-semibold text-[#11152F] mb-1.5 sm:mb-2 font-['Plus_Jakarta_Sans',sans-serif]">
                  Are you clinically diagnosed with ADHD? <span className="text-[#EF4444]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                  {[
                    { value: 'yes', label: 'Yes' },
                    { value: 'no', label: 'No' },
                    { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                  ].map(opt => {
                    const isSelected = form.adhdDiagnosis === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#6D5AE6] bg-[#EDEAF8]/50 shadow-xs'
                            : errors.adhdDiagnosis
                            ? 'border-[#EF4444]/60 bg-[#FDF0EE]/30 hover:border-[#EF4444]'
                            : 'border-[#E9E8F2] bg-white hover:border-[#C5C1F1] hover:bg-[#F8F8FC]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="adhdDiagnosis"
                          value={opt.value}
                          checked={isSelected}
                          onChange={() => {
                            setForm(f => ({ ...f, adhdDiagnosis: opt.value as ADHDDiagnosisOption }));
                            setErrors(err => ({ ...err, adhdDiagnosis: '' }));
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? 'border-[#6D5AE6] bg-[#6D5AE6]'
                              : 'border-[#D4D2E8] bg-white'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <span className={`text-xs sm:text-sm font-semibold font-['Plus_Jakarta_Sans',sans-serif] ${
                          isSelected ? 'text-[#6D5AE6]' : 'text-[#252640]'
                        }`}>
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
              <button onClick={() => setStep(1)} className="btn-ghost justify-center text-xs sm:text-sm py-2.5">
                ← Back
              </button>
              <button onClick={handleSubmit} className="btn-primary px-6 sm:px-7 py-2.5 justify-center text-xs sm:text-sm">
                Create session
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="animate-pop-in text-center">
            {/* Success icon */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#E4F5F2] rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-sm">
              <CheckCircle size={32} className="text-[#0D9488] sm:w-9 sm:h-9" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#11152F] mb-2 sm:mb-3 font-['Plus_Jakarta_Sans',sans-serif]">
              You're registered
            </h1>
            <p className="text-xs sm:text-sm text-[#73758C] mb-6 sm:mb-10">
              Your research session has been created. Please note your participant ID below.
            </p>

            {/* ID card */}
            <div className="bg-white rounded-2xl border-2 border-[#E9E8F2] p-5 sm:p-8 max-w-sm mx-auto mb-6 sm:mb-8 shadow-sm">
              <div className="flex items-center gap-3 mb-4 sm:mb-6 justify-center">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#EDEAF8] rounded-xl flex items-center justify-center">
                  <User size={18} className="text-[#6D5AE6]" />
                </div>
                <div className="text-left">
                  <div className="text-xs text-[#73758C]">Welcome,</div>
                  <div className="text-xs sm:text-sm font-bold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif]">{form.name}</div>
                </div>
              </div>

              <div className="bg-[#F8F8FC] rounded-xl border border-[#E9E8F2] p-4 sm:p-5 mb-4">
                <div className="text-[11px] sm:text-xs text-[#73758C] mb-1.5 sm:mb-2 uppercase tracking-wider font-semibold font-['Plus_Jakarta_Sans',sans-serif]">
                  Participant ID
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-[#6D5AE6] font-['JetBrains_Mono',monospace] tracking-wider">
                  {generatedId}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs sm:text-sm">
                <div className="bg-[#F8F8FC] rounded-lg p-2.5 sm:p-3 text-left">
                  <div className="text-xs text-[#73758C] mb-0.5">Age</div>
                  <div className="font-semibold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif]">{form.age}</div>
                </div>
                <div className="bg-[#F8F8FC] rounded-lg p-2.5 sm:p-3 text-left">
                  <div className="text-xs text-[#73758C] mb-0.5">Gender</div>
                  <div className="font-semibold text-[#11152F] font-['Plus_Jakarta_Sans',sans-serif] truncate">{form.gender}</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-[#9597AB] max-w-xs mx-auto mb-6 sm:mb-8">
              This ID identifies your research session. You may wish to note it for reference, though it is not required to complete the study.
            </p>

            <button onClick={handleBegin} className="btn-primary px-8 sm:px-10 py-3.5 sm:py-4 text-sm sm:text-base w-full sm:w-auto justify-center">
              Continue to Activities
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
