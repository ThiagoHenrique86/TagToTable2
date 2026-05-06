import {ChangeDetectionStrategy, Component, signal, inject, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {Router, RouterModule} from '@angular/router';
import {supabase} from './supabase';
import packageInfo from '../../package.json';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-login',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, RouterModule],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-outline-variant/10">
        <div class="text-center mb-8">
          <div class="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mx-auto mb-4">
            <mat-icon class="text-primary text-3xl">lock</mat-icon>
          </div>
          <h1 class="text-2xl font-headline font-extrabold text-primary tracking-tight">Bem-vindo de volta</h1>
          <p class="text-on-surface-variant text-sm">Acesse sua conta TagToTable2</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-6">
          <div class="space-y-2">
            <label for="identifier" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">E-mail, CPF ou Telefone</label>
            <div class="relative">
              <mat-icon class="absolute left-3 top-3 text-on-surface-variant/50">person</mat-icon>
              <input id="identifier" formControlName="identifier" type="text" placeholder="seu@email.com ou 000.000.000-00"
                     class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
            </div>
          </div>

          <div class="space-y-2">
            <div class="flex justify-between items-center">
              <label for="password" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Senha</label>
              <button type="button" (click)="onNotifyAdminForgotPassword()" [disabled]="loginForm.get('identifier')?.invalid || isLoading()" 
                      class="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline disabled:opacity-50 disabled:no-underline">
                Avisar administrador (Esqueci senha)
              </button>
            </div>
            <div class="relative">
              <mat-icon class="absolute left-3 top-3 text-on-surface-variant/50">lock</mat-icon>
              <input id="password" formControlName="password" [type]="showPassword() ? 'text' : 'password'" placeholder="••••••••"
                     class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 pl-10 pr-12 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              <button type="button" (click)="togglePassword()" class="absolute right-3 top-2.5 p-1 text-on-surface-variant/50 hover:text-primary transition-colors">
                <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </div>

          @if (error()) {
            <p class="text-red-600 text-xs font-bold text-center">{{ error() }}</p>
          }

          @if (successMessage()) {
            <div class="p-3 bg-green-50 rounded-xl border border-green-100">
              <p class="text-green-700 text-[10px] font-bold text-center uppercase tracking-widest">{{ successMessage() }}</p>
            </div>
          }

          <button type="submit" [disabled]="loginForm.invalid || isLoading()"
                  class="w-full py-4 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-wide shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {{ isLoading() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>

        <div class="mt-8 pt-6 border-t border-outline-variant/10 text-center">
          <p class="text-xs text-on-surface-variant">Não tem uma conta? <a routerLink="/request-access" class="text-primary font-bold hover:underline cursor-pointer">Solicitar acesso</a></p>
        </div>
      </div>
      
      <!-- Version display -->
      <p class="mt-8 text-[10px] text-on-surface-variant/40 font-mono uppercase tracking-widest">v{{ appVersion() }}</p>
    </div>
  `,
})
export class Login {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  loginForm = new FormGroup({
    identifier: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required, Validators.minLength(4)]),
  });

  isLoading = signal(false);
  error = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  showPassword = signal(false);
  appVersion = signal(packageInfo.version);

  togglePassword() {
    this.showPassword.update(v => !v);
  }

  async onResendPassword() {
    /* 
    Funcionalidade comentada para uso futuro com domínio próprio
    const email = this.loginForm.value.email?.trim().toLowerCase();
    ...
    */
  }

  async onNotifyAdminForgotPassword() {
    const identifier = this.loginForm.value.identifier?.trim().toLowerCase();
    if (!identifier || this.loginForm.get('identifier')?.invalid) {
      this.error.set('Por favor, digite seu e-mail, CPF ou telefone primeiro.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.successMessage.set(null);

    try {
      const response = await fetch('/api/notify-admin-forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier }),
      });

      const result = await response.json();

      if (!response.ok) {
        this.error.set(result.error || 'Erro ao processar solicitação.');
        return;
      }

      this.successMessage.set(`Administrador notificado! Favor aguardar o contato.`);
      
      // Clear message after 10 seconds
      setTimeout(() => this.successMessage.set(null), 10000);

    } catch (err) {
      console.error('Error notifying admin:', err);
      this.error.set('Erro ao processar solicitação. Verifique sua conexão.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.loginForm.invalid) return;
    
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Check if Supabase is correctly configured
      const url = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : '';
      const isPlaceholder = !url || url.includes('placeholder.supabase.co') || url === 'undefined' || url === '';
      if (isPlaceholder) {
        this.error.set('Erro de configuração: Variáveis do Supabase não encontradas no servidor.');
        return;
      }

      const identifier = this.loginForm.value.identifier?.trim().toLowerCase();
      const password = this.loginForm.value.password;
      
      // Clean identifier for CPF/Phone comparison (remove non-digits)
      const digitsOnly = identifier?.replace(/\D/g, '') || '';

      // Fetch user by email, cpf, or phone
      const { data, error } = await supabase
        .from('xml_users')
        .select('*')
        .or(`email.eq.${identifier},cpf.eq.${digitsOnly},phone.eq.${digitsOnly}`)
        .maybeSingle();

      if (error || !data) {
        console.error('Supabase query error or no data:', error);
        if (error) {
          this.error.set(`Erro de conexão: ${error.message}`);
        } else {
          this.error.set('Usuário não encontrado.');
        }
        return;
      }

      // Check status
      if (data.status !== 'Ativo') {
        this.error.set('Este usuário está inativo. Entre em contato com o administrador.');
        return;
      }

      // Check expiration date (only if filled)
      if (data.expiration_date && data.expiration_date !== '') {
        const expirationDate = new Date(data.expiration_date);
        
        // Check if date is valid
        if (!isNaN(expirationDate.getTime())) {
          const today = new Date();
          // Set expiration to end of day, today to start of day
          expirationDate.setHours(23, 59, 59, 999);
          today.setHours(0, 0, 0, 0);

          if (today > expirationDate) {
            // Deactivate user in database
            await supabase
              .from('xml_users')
              .update({ status: 'Inativo' })
              .eq('id', data.id);
            
            this.error.set('Seu acesso expirou em ' + expirationDate.toLocaleDateString('pt-BR') + '. Favor entrar em contato com o administrador.');
            return;
          }
        }
      }

      // Check password
      if (password === data.password) {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('isLoggedIn', 'true');
          localStorage.setItem('userId', data.id);
          localStorage.setItem('userRole', data.role);
          localStorage.setItem('userEmail', data.email);
          localStorage.setItem('userAvatar', data.avatar_url || '');
        }
        this.router.navigate(['/']);
      } else {
        this.error.set('Senha incorreta.');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.error.set('Ocorreu um erro ao tentar entrar. Verifique sua conexão.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
