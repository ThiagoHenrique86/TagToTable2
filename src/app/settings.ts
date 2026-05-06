import {ChangeDetectionStrategy, Component, signal, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {supabase} from './supabase';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-settings',
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <header class="mb-10">
      <h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">Configurações do Perfil</h1>
      <p class="text-on-surface-variant font-medium">Gerencie suas informações pessoais e preferências de conta.</p>
    </header>

    <div class="grid grid-cols-12 gap-8">
      <!-- Profile Sidebar -->
      <div class="col-span-12 lg:col-span-4">
        <div class="bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-8 text-center">
          <div class="relative inline-block mb-6">
            <div class="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary overflow-hidden border-4 border-surface-container-low">
              @if (avatarUrl()) {
                <img [src]="avatarUrl()" alt="Avatar" class="w-full h-full object-cover">
              } @else {
                <mat-icon class="text-5xl">person</mat-icon>
              }
            </div>
            <button (click)="fileInput.click()" class="absolute bottom-0 right-0 w-10 h-10 bg-primary text-on-primary rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
              <mat-icon class="text-sm">photo_camera</mat-icon>
            </button>
            <input #fileInput type="file" (change)="onAvatarChange($event)" class="hidden" accept="image/*">
          </div>
          
          <h2 class="text-xl font-headline font-bold text-primary">{{ userName() }}</h2>
          <p class="text-on-surface-variant text-sm font-medium mb-6">{{ userEmail() }}</p>
          
          <div class="flex flex-wrap justify-center gap-2">
            <span class="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">{{ userRole() }}</span>
            <span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest">Ativo</span>
          </div>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="col-span-12 lg:col-span-8">
        <div class="bg-white rounded-2xl shadow-sm border border-outline-variant/10">
          <div class="px-8 py-6 border-b border-outline-variant/10">
            <h3 class="font-headline font-bold text-primary">Informações Pessoais</h3>
          </div>
          
          <form [formGroup]="settingsForm" (ngSubmit)="onSubmit()" class="p-8 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nome Completo</label>
                <input formControlName="name" type="text" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>
              
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">E-mail</label>
                <input formControlName="email" type="email" readonly class="w-full bg-surface-container-low/50 border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 text-sm text-on-surface-variant cursor-not-allowed">
              </div>
              
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">CPF</label>
                <input formControlName="cpf" type="text" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>
              
              <div class="space-y-2">
                <label class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Telefone</label>
                <input formControlName="phone" type="text" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>
            </div>

            <div class="pt-6 border-t border-outline-variant/10 flex justify-end gap-4">
              <button type="button" (click)="resetForm()" class="px-6 py-3 rounded-xl text-primary font-bold text-sm hover:bg-surface-container-low transition-colors">Descartar</button>
              <button type="submit" [disabled]="settingsForm.invalid || isLoading()" class="px-8 py-3 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-wide shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                {{ isLoading() ? 'Salvando...' : 'Salvar Alterações' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Security Section -->
        <div class="mt-8 bg-white rounded-2xl shadow-sm border border-outline-variant/10 p-8">
          <div class="flex items-center justify-between mb-6">
            <div>
              <h3 class="font-headline font-bold text-primary">Segurança</h3>
              <p class="text-on-surface-variant text-sm">Atualize sua senha e gerencie o acesso à sua conta.</p>
            </div>
            <mat-icon class="text-primary/20 text-4xl">security</mat-icon>
          </div>
          
          <button routerLink="/change-password" class="flex items-center gap-3 px-6 py-4 rounded-xl border border-outline-variant/30 hover:bg-surface-container-low transition-colors group w-full text-left">
            <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
              <mat-icon>key</mat-icon>
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold text-primary">Alterar Senha de Acesso</div>
              <div class="text-[10px] text-on-surface-variant uppercase tracking-widest">Recomendado a cada 90 dias</div>
            </div>
            <mat-icon class="text-on-surface-variant">chevron_right</mat-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    @if (showSuccess()) {
      <div class="fixed bottom-8 right-8 bg-primary text-on-primary px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300">
        <mat-icon>check_circle</mat-icon>
        <span class="font-bold text-sm">Perfil atualizado com sucesso!</span>
      </div>
    }
  `,
})
export class Settings implements OnInit {
  private platformId = inject(PLATFORM_ID);
  
  userName = signal('');
  userEmail = signal('');
  userRole = signal('');
  avatarUrl = signal('');
  isLoading = signal(false);
  showSuccess = signal(false);

  settingsForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl({value: '', disabled: true}),
    cpf: new FormControl(''),
    phone: new FormControl(''),
  });

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadUserData();
    }
  }

  async loadUserData() {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('xml_users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (data) {
        this.userName.set(data.name || '');
        this.userEmail.set(data.email || '');
        this.userRole.set(data.role || '');
        this.avatarUrl.set(data.avatar_url || '');

        this.settingsForm.patchValue({
          name: data.name || '',
          email: data.email || '',
          cpf: data.cpf || '',
          phone: data.phone || '',
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  resetForm() {
    this.loadUserData();
  }

  async onAvatarChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    this.isLoading.set(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('xml_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('xml_assets')
        .getPublicUrl(filePath);

      // Update user profile
      const { error: updateError } = await supabase
        .from('xml_users')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      this.avatarUrl.set(publicUrl);
      localStorage.setItem('userAvatar', publicUrl);
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (error) {
      console.error('Error uploading avatar:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async onSubmit() {
    if (this.settingsForm.invalid) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    this.isLoading.set(true);
    try {
      const { error } = await supabase
        .from('xml_users')
        .update({
          name: this.settingsForm.value.name,
          cpf: this.settingsForm.value.cpf,
          phone: this.settingsForm.value.phone,
        })
        .eq('id', userId);

      if (error) throw error;

      this.userName.set(this.settingsForm.value.name || '');
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
