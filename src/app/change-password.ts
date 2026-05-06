import {ChangeDetectionStrategy, Component, signal, inject, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {Router} from '@angular/router';
import {supabase} from './supabase';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-change-password',
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <header class="mb-10">
      <h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">Segurança da Conta</h1>
      <p class="text-on-surface-variant font-medium">Atualize sua senha para manter seus dados protegidos.</p>
    </header>

    <div class="max-w-2xl mx-auto">
      <div class="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
        <div class="bg-amber-50 p-6 flex items-start gap-4 border-b border-amber-100">
          <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <mat-icon>warning</mat-icon>
          </div>
          <div>
            <h3 class="text-amber-900 font-bold text-sm">Dica de Segurança</h3>
            <p class="text-amber-800 text-xs mt-1">Use uma combinação de letras maiúsculas, minúsculas, números e símbolos para uma senha forte.</p>
          </div>
        </div>

        <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()" class="p-8 space-y-6">
          <div class="space-y-2">
            <label for="currentPassword" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Senha Atual</label>
            <div class="relative">
              <mat-icon class="absolute left-3 top-3 text-on-surface-variant/50">lock_open</mat-icon>
              <input id="currentPassword" formControlName="currentPassword" [type]="showCurrent() ? 'text' : 'password'" 
                     class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 pl-10 pr-12 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              <button type="button" (click)="showCurrent.set(!showCurrent())" class="absolute right-3 top-2.5 p-1 text-on-surface-variant/50 hover:text-primary transition-colors">
                <mat-icon>{{ showCurrent() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label for="newPassword" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nova Senha</label>
              <div class="relative">
                <mat-icon class="absolute left-3 top-3 text-on-surface-variant/50">lock</mat-icon>
                <input id="newPassword" formControlName="newPassword" [type]="showNew() ? 'text' : 'password'" 
                       class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 pl-10 pr-12 focus:ring-2 focus:ring-primary text-sm transition-shadow">
                <button type="button" (click)="showNew.set(!showNew())" class="absolute right-3 top-2.5 p-1 text-on-surface-variant/50 hover:text-primary transition-colors">
                  <mat-icon>{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label for="confirmPassword" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Confirmar Nova Senha</label>
              <div class="relative">
                <mat-icon class="absolute left-3 top-3 text-on-surface-variant/50">verified_user</mat-icon>
                <input id="confirmPassword" formControlName="confirmPassword" [type]="showConfirm() ? 'text' : 'password'" 
                       class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 pl-10 pr-12 focus:ring-2 focus:ring-primary text-sm transition-shadow">
                <button type="button" (click)="showConfirm.set(!showConfirm())" class="absolute right-3 top-2.5 p-1 text-on-surface-variant/50 hover:text-primary transition-colors">
                  <mat-icon>{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
              </div>
            </div>
          </div>

          @if (error()) {
            <div class="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
              <mat-icon class="text-red-600">error</mat-icon>
              <span class="text-red-700 text-xs font-bold">{{ error() }}</span>
            </div>
          }

          <div class="pt-6 border-t border-outline-variant/10 flex justify-end gap-4">
            <button type="button" (click)="goBack()" class="px-6 py-3 rounded-xl text-primary font-bold text-sm hover:bg-surface-container-low transition-colors">Cancelar</button>
            <button type="submit" [disabled]="passwordForm.invalid || isLoading()" class="px-8 py-3 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-wide shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
              {{ isLoading() ? 'Atualizando...' : 'Atualizar Senha' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Success Toast -->
    @if (showSuccess()) {
      <div class="fixed bottom-8 right-8 bg-primary text-on-primary px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300">
        <mat-icon>check_circle</mat-icon>
        <span class="font-bold text-sm">Senha atualizada com sucesso!</span>
      </div>
    }
  `,
})
export class ChangePassword {
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  
  isLoading = signal(false);
  showSuccess = signal(false);
  error = signal<string | null>(null);
  
  showCurrent = signal(false);
  showNew = signal(false);
  showConfirm = signal(false);

  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(g: AbstractControl) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : {'mismatch': true};
  }

  goBack() {
    this.router.navigate(['/settings']);
  }

  async onSubmit() {
    if (this.passwordForm.invalid) return;

    const userId = isPlatformBrowser(this.platformId) ? localStorage.getItem('userId') : null;
    if (!userId) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      // 1. Verify current password
      const { data, error: fetchError } = await supabase
        .from('xml_users')
        .select('password')
        .eq('id', userId)
        .single();

      if (fetchError) throw fetchError;

      if (data.password !== this.passwordForm.value.currentPassword) {
        this.error.set('A senha atual está incorreta.');
        return;
      }

      // 2. Update to new password
      const { error: updateError } = await supabase
        .from('xml_users')
        .update({ password: this.passwordForm.value.newPassword })
        .eq('id', userId);

      if (updateError) throw updateError;

      this.showSuccess.set(true);
      setTimeout(() => {
        this.showSuccess.set(false);
        this.router.navigate(['/settings']);
      }, 2000);
    } catch (error) {
      console.error('Error changing password:', error);
      this.error.set('Ocorreu um erro ao atualizar a senha.');
    } finally {
      this.isLoading.set(false);
    }
  }
}

import { AbstractControl } from '@angular/forms';
