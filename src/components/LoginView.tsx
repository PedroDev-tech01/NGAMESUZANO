import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { formatCNPJ, onlyDigits, validateCNPJ } from '../utils/formatters';
import { AuthUser } from '../types';
import { api } from '../services/api';
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: (targetTheme?: 'dark' | 'light') => void;
}

const STORAGE_REMEMBER_CNPJ = 'ngames_remembered_cnpj';

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [cnpj, setCnpj] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_REMEMBER_CNPJ) || '';
    } catch {
      return '';
    }
  });
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cnpjTouched, setCnpjTouched] = useState(false);
  const [senhaTouched, setSenhaTouched] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem(STORAGE_REMEMBER_CNPJ));
    } catch {
      return false;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Derived real-time validations
  const cnpjDigits = onlyDigits(cnpj);
  const isCnpjComplete = cnpjDigits.length === 14;
  const cnpjValidation = cnpjDigits.length > 0 ? validateCNPJ(cnpjDigits) : null;
  const isCnpjValid = Boolean(cnpjValidation?.isValid);

  const cleanSenha = senha.trim();
  const isSenhaValid = cleanSenha.length >= 6;

  // Handle CNPJ typing with mask
  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const formatted = formatCNPJ(raw);
    setCnpj(formatted);
    if (errorMsg) setErrorMsg(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSenha(e.target.value);
    if (errorMsg) setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setCnpjTouched(true);
    setSenhaTouched(true);

    if (!cnpjDigits) {
      setErrorMsg('Por favor, informe o CNPJ da empresa.');
      document.getElementById('login-cnpj')?.focus();
      return;
    }

    if (!isCnpjComplete) {
      setErrorMsg(`CNPJ incompleto (${cnpjDigits.length}/14 dígitos). Digite todos os 14 números.`);
      document.getElementById('login-cnpj')?.focus();
      return;
    }

    if (!isCnpjValid) {
      setErrorMsg(cnpjValidation?.error || 'CNPJ inválido pelos dígitos verificadores.');
      document.getElementById('login-cnpj')?.focus();
      return;
    }

    if (!cleanSenha) {
      setErrorMsg('Por favor, informe a senha de acesso.');
      document.getElementById('login-senha')?.focus();
      return;
    }

    if (!isSenhaValid) {
      setErrorMsg('A senha de acesso deve conter no mínimo 6 caracteres.');
      document.getElementById('login-senha')?.focus();
      return;
    }

    setIsLoading(true);

    try {
      // Remember CNPJ preference
      if (rememberMe) {
        try {
          localStorage.setItem(STORAGE_REMEMBER_CNPJ, cnpj);
        } catch {
          // ignore
        }
      } else {
        try {
          localStorage.removeItem(STORAGE_REMEMBER_CNPJ);
        } catch {
          // ignore
        }
      }

      // Authenticate via backend API (validates account against database)
      const res = await api.login(cnpj, senha);
      const user: AuthUser = res.user;

      setIsSuccess(true);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao realizar login. Verifique suas credenciais.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0C10] text-[#FFFFFF] flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#E51D24]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-[#E51D24]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#22252B_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />

      {/* Top Header Bar with Theme Toggle */}
      <header className="w-full px-6 py-4 flex items-center justify-end z-10 relative">
        {onToggleTheme && (
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        )}
      </header>

      {/* Main Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="w-full max-w-[440px] bg-[#101216] border border-[#22252B] rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md relative"
        >
          {/* Subtle top brand accent line */}
          <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-[#E51D24] to-transparent" />

          {/* Logo & Brand Title */}
          <div className="flex flex-col items-center text-center mb-7">
            <div className="mb-3">
              <Logo size="lg" showText={false} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-2xl tracking-tight text-white uppercase">
                N<span className="text-[#E51D24]">!</span> GAMES
              </span>
            </div>
            <span className="text-[11px] font-mono font-extrabold text-[#E51D24] uppercase tracking-widest mt-0.5">
              #TMJ<span className="text-white">SEMPRE</span>
            </span>
            <p className="text-xs text-[#9CA3AF] mt-2 max-w-[280px]">
              Sistema de Gestão &amp; Assistência Técnica Especializada
            </p>
          </div>

          {/* Error Message Alert */}
          <AnimatePresence>
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-5 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start gap-2.5 text-xs text-[#FCA5A5]"
              >
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span className="flex-1">{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success feedback animation */}
          {isSuccess && (
            <div className="mb-5 p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 flex items-center gap-2.5 text-xs text-[#34D399]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 animate-bounce" />
              <span className="font-semibold">Autenticado com sucesso! Entrando...</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Campo CNPJ */}
            <div>
              <label
                htmlFor="login-cnpj"
                className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 flex items-center justify-between"
              >
                <span>CNPJ da Empresa</span>
                {isCnpjComplete && isCnpjValid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> CNPJ Válido
                  </span>
                ) : isCnpjComplete && !isCnpjValid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#EF4444] font-semibold">
                    <AlertCircle className="w-3.5 h-3.5" /> CNPJ Inválido
                  </span>
                ) : cnpjDigits.length > 0 ? (
                  <span className="text-[11px] text-[#F59E0B] font-mono font-medium">
                    {cnpjDigits.length}/14 dígitos
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-[#9CA3AF]">14 dígitos</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                  <Building2 className="w-4 h-4 text-[#9CA3AF]" />
                </div>
                <input
                  id="login-cnpj"
                  type="text"
                  inputMode="numeric"
                  autoComplete="organization"
                  value={cnpj}
                  onChange={handleCnpjChange}
                  onBlur={() => setCnpjTouched(true)}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  disabled={isLoading || isSuccess}
                  className={`w-full pl-10 pr-10 py-2.5 bg-[#181C23] border rounded-lg font-mono text-sm text-white placeholder-[#4B5563] focus:outline-none transition-colors disabled:opacity-50 ${
                    isCnpjComplete && isCnpjValid
                      ? 'border-[#10B981] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20'
                      : isCnpjComplete && !isCnpjValid
                      ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20'
                      : cnpjTouched && !cnpjDigits
                      ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20'
                      : 'border-[#2A303C] focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20'
                  }`}
                  autoFocus
                />
                {isCnpjComplete && isCnpjValid && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#10B981]">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
                {isCnpjComplete && !isCnpjValid && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#EF4444]">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                )}
              </div>
              {isCnpjComplete && !isCnpjValid && (
                <p className="mt-1.5 text-[11px] text-[#EF4444] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{cnpjValidation?.error || 'Dígitos verificadores do CNPJ incorretos.'}</span>
                </p>
              )}
              {cnpjTouched && !cnpjDigits && (
                <p className="mt-1.5 text-[11px] text-[#EF4444] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Informe o CNPJ da empresa.</span>
                </p>
              )}
              {cnpjTouched && cnpjDigits.length > 0 && !isCnpjComplete && (
                <p className="mt-1.5 text-[11px] text-[#F59E0B] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>CNPJ incompleto. Digite todos os 14 dígitos ({14 - cnpjDigits.length} restantes).</span>
                </p>
              )}
            </div>

            {/* Campo Senha */}
            <div>
              <label
                htmlFor="login-senha"
                className="block text-xs font-semibold text-[#D1D5DB] mb-1.5 flex items-center justify-between"
              >
                <span>Senha de Acesso</span>
                {isSenhaValid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Senha Válida
                  </span>
                ) : cleanSenha.length > 0 ? (
                  <span className="text-[11px] text-[#F59E0B] font-mono font-medium">
                    {cleanSenha.length}/6 caracteres
                  </span>
                ) : (
                  <span className="text-[11px] text-[#9CA3AF]">Mínimo 6 caracteres</span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                  <Lock className="w-4 h-4 text-[#9CA3AF]" />
                </div>
                <input
                  id="login-senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={handlePasswordChange}
                  onBlur={() => setSenhaTouched(true)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={isLoading || isSuccess}
                  className={`w-full pl-10 pr-10 py-2.5 bg-[#181C23] border rounded-lg text-sm text-white placeholder-[#4B5563] focus:outline-none transition-colors disabled:opacity-50 ${
                    isSenhaValid
                      ? 'border-[#10B981] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20'
                      : senhaTouched && cleanSenha.length === 0
                      ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/20'
                      : cleanSenha.length > 0 && !isSenhaValid
                      ? 'border-[#F59E0B]/60 focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/20'
                      : 'border-[#2A303C] focus:border-[#E51D24] focus:ring-2 focus:ring-[#E51D24]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#6B7280] hover:text-white transition-colors cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Barra indicadora de comprimento/requisito da senha */}
              {cleanSenha.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  <div className="grid grid-cols-3 gap-1.5 h-1">
                    <div
                      className={`h-full rounded-full transition-colors ${
                        cleanSenha.length < 4
                          ? 'bg-[#EF4444]'
                          : cleanSenha.length < 6
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#10B981]'
                      }`}
                    />
                    <div
                      className={`h-full rounded-full transition-colors ${
                        cleanSenha.length < 4
                          ? 'bg-[#2A303C]'
                          : cleanSenha.length < 6
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#10B981]'
                      }`}
                    />
                    <div
                      className={`h-full rounded-full transition-colors ${
                        cleanSenha.length < 6 ? 'bg-[#2A303C]' : 'bg-[#10B981]'
                      }`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={
                        isSenhaValid
                          ? 'text-[#10B981] font-medium'
                          : 'text-[#F59E0B]'
                      }
                    >
                      {isSenhaValid
                        ? 'Comprimento seguro atingido (6+ caracteres)'
                        : `Requer no mínimo 6 caracteres (${6 - cleanSenha.length} restantes)`}
                    </span>
                    <span className="text-[#6B7280] font-mono">{cleanSenha.length} chars</span>
                  </div>
                </div>
              )}

              {senhaTouched && !cleanSenha && (
                <p className="mt-1.5 text-[11px] text-[#EF4444] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Informe a senha de acesso.</span>
                </p>
              )}
            </div>

            {/* Opções: Lembrar CNPJ */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#9CA3AF] hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-[#181C23] border-[#2A303C] text-[#E51D24] focus:ring-[#E51D24]/30 focus:ring-offset-0 cursor-pointer accent-[#E51D24]"
                />
                <span>Lembrar CNPJ neste dispositivo</span>
              </label>
            </div>

            {/* Botão Entrar */}
            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading || isSuccess}
              className="w-full mt-2 py-3 px-4 bg-[#E51D24] hover:bg-[#C4141A] active:bg-[#A30F15] text-white font-bold text-sm rounded-lg flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(229,29,36,0.35)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando Acesso...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Rodapé de Segurança */}
          <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#6B7280]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Ambiente Seguro &amp; Criptografado</span>
          </div>
        </motion.div>
      </main>

      {/* Footer Bar */}
      <footer className="w-full py-4 text-center text-xs text-[#6B7280] z-10 relative">
        <p>N! GAMES © {new Date().getFullYear()} · Todos os direitos reservados</p>
      </footer>
    </div>
  );
};
