import {Component, inject, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router, RouterModule} from '@angular/router';
import {ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators, AbstractControl, ValidationErrors} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import {supabase} from './supabase';

// Validador de CPF
function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const cpf = control.value ? control.value.replace(/[^\d]+/g, '') : '';
  if (!cpf) return null;
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return { cpfInvalid: true };
  
  const calculateDigit = (slice: string, factor: number) => {
    let sum = 0;
    for (const char of slice) {
      sum += parseInt(char) * factor--;
    }
    const result = (sum * 10) % 11;
    return result === 10 ? 0 : result;
  };

  const digit1 = calculateDigit(cpf.slice(0, 9), 10);
  const digit2 = calculateDigit(cpf.slice(0, 10), 11);

  if (digit1 !== parseInt(cpf[9]) || digit2 !== parseInt(cpf[10])) {
    return { cpfInvalid: true };
  }
  return null;
}

// Validador de Telefone (Brasil)
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const phone = control.value ? control.value.replace(/[^\d]+/g, '') : '';
  if (!phone) return null;
  // Aceita 10 ou 11 dígitos (com DDD)
  if (phone.length < 10 || phone.length > 11) return { phoneInvalid: true };
  return null;
}

@Component({
  selector: 'app-request-access',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <div class="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div class="flex flex-col items-center mb-8">
          <div class="w-16 h-16 bg-[#5A5A40] rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <mat-icon class="text-white text-3xl">person_add</mat-icon>
          </div>
          <h1 class="text-2xl font-serif font-bold text-[#1a1a1a]">Solicitar Acesso</h1>
          <p class="text-[#5A5A40] text-sm mt-2 text-center">Preencha os dados abaixo para solicitar sua conta.</p>
        </div>

        @if (success()) {
          <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center animate-in fade-in zoom-in duration-300">
            <mat-icon class="text-emerald-500 text-5xl mb-4">check_circle</mat-icon>
            <h2 class="text-emerald-900 font-bold text-lg mb-2">Solicitação Enviada!</h2>
            <p class="text-emerald-700 text-sm mb-6">
              Recebemos seu pedido. Nossa equipe analisará as informações e entrará em contato o mais breve possível.
            </p>
            <button 
              routerLink="/login"
              class="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-medium hover:bg-[#4a4a35] transition-all shadow-md active:scale-95">
              Voltar ao Login
            </button>
          </div>
        } @else {
          <form [formGroup]="requestForm" (ngSubmit)="onSubmit()" class="space-y-5">
            <!-- Nome Completo -->
            <div>
              <label for="fullName" class="block text-xs font-medium text-[#5A5A40] uppercase tracking-wider mb-1 ml-1">Nome Completo</label>
              <div class="relative">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A40] opacity-50">person</mat-icon>
                <input 
                  id="fullName"
                  type="text" 
                  formControlName="fullName"
                  placeholder="Seu nome completo"
                  class="w-full pl-10 pr-4 py-3 bg-[#f5f5f0] border-none rounded-xl focus:ring-2 focus:ring-[#5A5A40] transition-all text-sm"
                  [class.ring-2]="requestForm.get('fullName')?.invalid && requestForm.get('fullName')?.touched"
                  [class.ring-red-400]="requestForm.get('fullName')?.invalid && requestForm.get('fullName')?.touched">
              </div>
              @if (requestForm.get('fullName')?.invalid && requestForm.get('fullName')?.touched) {
                <p class="text-[10px] text-red-500 mt-1 ml-1">Nome completo é obrigatório (mín. 3 caracteres).</p>
              }
            </div>

            <!-- CPF -->
            <div>
              <label for="cpf" class="block text-xs font-medium text-[#5A5A40] uppercase tracking-wider mb-1 ml-1">CPF</label>
              <div class="relative">
                <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A40] opacity-50">badge</mat-icon>
                <input 
                  id="cpf"
                  type="text" 
                  formControlName="cpf"
                  placeholder="000.000.000-00"
                  (input)="onCpfInput($event)"
                  maxlength="14"
                  class="w-full pl-10 pr-4 py-3 bg-[#f5f5f0] border-none rounded-xl focus:ring-2 focus:ring-[#5A5A40] transition-all text-sm"
                  [class.ring-2]="requestForm.get('cpf')?.invalid && requestForm.get('cpf')?.touched"
                  [class.ring-red-400]="requestForm.get('cpf')?.invalid && requestForm.get('cpf')?.touched">
              </div>
              @if (requestForm.get('cpf')?.invalid && requestForm.get('cpf')?.touched) {
                <p class="text-[10px] text-red-500 mt-1 ml-1">CPF inválido.</p>
              }
            </div>

            <!-- Emails -->
            <div formArrayName="emails">
              <div class="flex items-center justify-between mb-1 ml-1">
                <label for="email-0" class="text-xs font-medium text-[#5A5A40] uppercase tracking-wider">E-mails</label>
                <button type="button" (click)="addEmail()" class="text-[#5A5A40] hover:text-[#1a1a1a] flex items-center text-[10px] font-bold uppercase tracking-tighter">
                  <mat-icon class="text-sm mr-1">add_circle</mat-icon> Adicionar
                </button>
              </div>
              @for (email of emails.controls; track $index) {
                <div class="relative mb-2 flex flex-col gap-1">
                  <div class="relative flex items-center gap-2">
                    <div class="relative flex-1">
                      <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A40] opacity-50">email</mat-icon>
                      <input 
                        [id]="'email-' + $index"
                        [formControlName]="$index"
                        type="email" 
                        placeholder="seu@email.com"
                        class="w-full pl-10 pr-4 py-3 bg-[#f5f5f0] border-none rounded-xl focus:ring-2 focus:ring-[#5A5A40] transition-all text-sm"
                        [class.ring-2]="email.invalid && email.touched"
                        [class.ring-red-400]="email.invalid && email.touched">
                    </div>
                    @if (emails.length > 1) {
                      <button type="button" (click)="removeEmail($index)" class="text-red-400 hover:text-red-600">
                        <mat-icon>remove_circle</mat-icon>
                      </button>
                    }
                  </div>
                  @if (email.invalid && email.touched) {
                    <p class="text-[10px] text-red-500 ml-1">E-mail inválido.</p>
                  }
                </div>
              }
            </div>

            <!-- Telefones -->
            <div formArrayName="phones">
              <div class="flex items-center justify-between mb-1 ml-1">
                <label for="phone-0" class="text-xs font-medium text-[#5A5A40] uppercase tracking-wider">Telefones</label>
                <button type="button" (click)="addPhone()" class="text-[#5A5A40] hover:text-[#1a1a1a] flex items-center text-[10px] font-bold uppercase tracking-tighter">
                  <mat-icon class="text-sm mr-1">add_circle</mat-icon> Adicionar
                </button>
              </div>
              @for (phone of phones.controls; track $index) {
                <div class="relative mb-2 flex flex-col gap-1">
                  <div class="relative flex items-center gap-2">
                    <div class="relative flex-1">
                      <mat-icon class="absolute left-3 top-1/2 -translate-y-1/2 text-[#5A5A40] opacity-50">phone</mat-icon>
                      <input 
                        [id]="'phone-' + $index"
                        [formControlName]="$index"
                        type="tel" 
                        placeholder="(00) 00000-0000"
                        class="w-full pl-10 pr-4 py-3 bg-[#f5f5f0] border-none rounded-xl focus:ring-2 focus:ring-[#5A5A40] transition-all text-sm"
                        [class.ring-2]="phone.invalid && phone.touched"
                        [class.ring-red-400]="phone.invalid && phone.touched">
                    </div>
                    @if (phones.length > 1) {
                      <button type="button" (click)="removePhone($index)" class="text-red-400 hover:text-red-600">
                        <mat-icon>remove_circle</mat-icon>
                      </button>
                    }
                  </div>
                  @if (phone.invalid && phone.touched) {
                    <p class="text-[10px] text-red-500 ml-1">Telefone inválido (mín. 10 dígitos com DDD).</p>
                  }
                </div>
              }
            </div>

            @if (error()) {
              <div class="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 flex items-center gap-2">
                <mat-icon class="text-sm">error</mat-icon>
                {{ error() }}
              </div>
            }

            <button 
              type="submit" 
              [disabled]="loading() || requestForm.invalid"
              class="w-full bg-[#5A5A40] text-white py-3 rounded-xl font-medium hover:bg-[#4a4a35] transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              @if (loading()) {
                <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Enviando...
              } @else {
                Solicitar Acesso
              }
            </button>

            <button 
              type="button"
              routerLink="/login"
              class="w-full text-[#5A5A40] text-sm font-medium hover:underline">
              Já tem uma conta? Faça login
            </button>
          </form>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class RequestAccess {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  requestForm: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  constructor() {
    this.requestForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      cpf: ['', [Validators.required, cpfValidator]],
      emails: this.fb.array([this.fb.control('', [Validators.required, Validators.email])]),
      phones: this.fb.array([this.fb.control('', [Validators.required, phoneValidator])])
    });
  }

  get emails() { return this.requestForm.get('emails') as FormArray; }
  get phones() { return this.requestForm.get('phones') as FormArray; }

  addEmail() { this.emails.push(this.fb.control('', [Validators.required, Validators.email])); }
  removeEmail(index: number) { this.emails.removeAt(index); }

  addPhone() { this.phones.push(this.fb.control('', [Validators.required, phoneValidator])); }
  removePhone(index: number) { this.phones.removeAt(index); }

  onCpfInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 11) value = value.slice(0, 11);
    
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, '$1.$2');
    }
    
    input.value = value;
    this.requestForm.get('cpf')?.setValue(value, { emitEvent: false });
  }

  async onSubmit() {
    if (this.requestForm.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const formValue = this.requestForm.value;

      // 1. Salvar na tabela xml_access_requests
      const { error: insertError } = await supabase
        .from('xml_access_requests')
        .insert({
          full_name: formValue.fullName,
          cpf: formValue.cpf.replace(/[^\d]+/g, ''), // Salva apenas números
          emails: formValue.emails,
          phones: formValue.phones.map((p: string) => p.replace(/[^\d]+/g, '')), // Salva apenas números
          status: 'Pendente'
        });

      if (insertError) throw insertError;

      // 2. Criar notificação para admins e managers
      const notificationMessage = `Nova solicitação de acesso de ${formValue.fullName} (CPF: ${formValue.cpf}). Emails: ${formValue.emails.join(', ')}. Telefones: ${formValue.phones.join(', ')}.`;
      
      await supabase
        .from('xml_notifications')
        .insert({
          title: 'Nova Solicitação de Acesso',
          message: notificationMessage,
          created_by: 'system',
          target_type: 'specific',
          target_users: [] 
        });
      
      this.success.set(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro ao enviar sua solicitação. Tente novamente.';
      console.error('Erro ao solicitar acesso:', err);
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
