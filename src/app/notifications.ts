import {ChangeDetectionStrategy, Component, signal, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {supabase} from './supabase';

interface Notification {
  id: string;
  created_at: string;
  title: string;
  message: string;
  target_type: 'all' | 'specific';
  target_users: string[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-notifications',
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <header class="mb-10">
      <h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">Gerenciamento de Notificações</h1>
      <p class="text-on-surface-variant font-medium">Envie comunicados e avisos importantes para os usuários da plataforma.</p>
    </header>

    <div class="grid grid-cols-12 gap-8">
      <!-- New Notification Form -->
      <div class="col-span-12 lg:col-span-5">
        <div class="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden">
          <div class="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-low/30">
            <h3 class="font-headline font-bold text-primary">Nova Notificação</h3>
          </div>
          
          <form [formGroup]="noteForm" (ngSubmit)="onSubmit()" class="p-8 space-y-6">
            <div class="space-y-2">
              <label for="title" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Título</label>
              <input id="title" formControlName="title" type="text" placeholder="Ex: Manutenção Programada"
                     class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
            </div>
            
            <div class="space-y-2">
              <label for="message" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Mensagem</label>
              <textarea id="message" formControlName="message" rows="4" placeholder="Descreva o aviso detalhadamente..."
                        class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow resize-none"></textarea>
            </div>

            <div class="space-y-2">
              <span class="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Público-Alvo</span>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" formControlName="targetType" value="all" class="hidden peer">
                  <div class="w-5 h-5 rounded-full border-2 border-outline-variant peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-all">
                    <div class="w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                  </div>
                  <span class="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">Todos os Usuários</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer group">
                  <input type="radio" formControlName="targetType" value="specific" class="hidden peer">
                  <div class="w-5 h-5 rounded-full border-2 border-outline-variant peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-all">
                    <div class="w-2 h-2 bg-white rounded-full opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                  </div>
                  <span class="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">Usuários Específicos</span>
                </label>
              </div>
            </div>

            @if (noteForm.get('targetType')?.value === 'specific') {
              <div class="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <span class="text-xs font-bold uppercase tracking-widest text-on-surface-variant block mb-2">Selecionar Usuários</span>
                <div class="max-h-40 overflow-y-auto border border-outline-variant/30 rounded-xl p-2 space-y-1">
                  @for (user of users(); track user.id) {
                    <label class="flex items-center gap-3 p-2 hover:bg-surface-container-low rounded-lg cursor-pointer transition-colors group">
                      <input type="checkbox" [value]="user.email" (change)="toggleUser(user.email)" class="hidden peer">
                      <div class="w-5 h-5 rounded border-2 border-outline-variant peer-checked:border-primary peer-checked:bg-primary flex items-center justify-center transition-all">
                        <mat-icon class="text-white text-[14px] opacity-0 peer-checked:opacity-100 transition-opacity">check</mat-icon>
                      </div>
                      <div class="flex-1">
                        <div class="text-xs font-bold text-primary group-hover:text-primary transition-colors">{{ user.name || user.email }}</div>
                        <div class="text-[10px] text-on-surface-variant uppercase tracking-widest">{{ user.email }}</div>
                      </div>
                    </label>
                  }
                </div>
              </div>
            }

            <div class="pt-6 border-t border-outline-variant/10">
              <button type="submit" [disabled]="noteForm.invalid || isLoading()" 
                      class="w-full py-4 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-wide shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                {{ isLoading() ? 'Enviando...' : 'Enviar Notificação' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Notification History -->
      <div class="col-span-12 lg:col-span-7">
        <div class="bg-white rounded-2xl shadow-sm border border-outline-variant/10 overflow-hidden h-full flex flex-col">
          <div class="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-low/30 flex justify-between items-center">
            <h3 class="font-headline font-bold text-primary">Histórico de Envios</h3>
            <button (click)="fetchNotifications()" class="p-2 hover:bg-surface-container-high rounded-full transition-colors text-primary">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
          
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            @for (note of history(); track note.id) {
              <div class="p-5 rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-all group relative">
                <button (click)="deleteNotification(note.id)" class="absolute top-4 right-4 p-1.5 text-on-surface-variant/30 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                  <mat-icon class="text-sm">delete</mat-icon>
                </button>
                <div class="flex items-start gap-4">
                  <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <mat-icon>campaign</mat-icon>
                  </div>
                  <div class="flex-1">
                    <div class="flex justify-between items-start mb-1">
                      <h4 class="font-bold text-primary">{{ note.title }}</h4>
                      <span class="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">{{ note.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
                    </div>
                    <p class="text-xs text-on-surface-variant mb-3 leading-relaxed">{{ note.message }}</p>
                    <div class="flex items-center gap-2">
                      <span [class.bg-emerald-100]="note.target_type === 'all'"
                            [class.text-emerald-700]="note.target_type === 'all'"
                            [class.bg-amber-100]="note.target_type === 'specific'"
                            [class.text-amber-700]="note.target_type === 'specific'"
                            class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {{ note.target_type === 'all' ? 'Todos' : 'Específico' }}
                      </span>
                      @if (note.target_type === 'specific') {
                        <span class="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{{ note.target_users.length }} usuários</span>
                      }
                    </div>
                  </div>
                </div>
              </div>
            } @empty {
              <div class="h-full flex flex-col items-center justify-center text-on-surface-variant/40 italic">
                <mat-icon class="text-6xl mb-2 opacity-20">history</mat-icon>
                <p>Nenhuma notificação enviada ainda.</p>
              </div>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- Success Toast -->
    @if (showSuccess()) {
      <div class="fixed bottom-8 right-8 bg-primary text-on-primary px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300">
        <mat-icon>check_circle</mat-icon>
        <span class="font-bold text-sm">Notificação enviada com sucesso!</span>
      </div>
    }
  `,
})
export class Notifications implements OnInit {
  private platformId = inject(PLATFORM_ID);
  
  history = signal<Notification[]>([]);
  users = signal<{id: string, email: string, name: string}[]>([]);
  isLoading = signal(false);
  showSuccess = signal(false);
  
  selectedUsers = new Set<string>();

  noteForm = new FormGroup({
    title: new FormControl('', [Validators.required, Validators.minLength(3)]),
    message: new FormControl('', [Validators.required, Validators.minLength(10)]),
    targetType: new FormControl('all', [Validators.required]),
  });

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await Promise.all([
        this.fetchNotifications(),
        this.fetchUsers()
      ]);
    }
  }

  async fetchUsers() {
    try {
      const { data, error } = await supabase
        .from('xml_users')
        .select('id, email, name')
        .order('name');
      
      if (error) throw error;
      if (data) this.users.set(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async fetchNotifications() {
    try {
      const { data, error } = await supabase
        .from('xml_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) this.history.set(data as Notification[]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  toggleUser(email: string) {
    if (this.selectedUsers.has(email)) {
      this.selectedUsers.delete(email);
    } else {
      this.selectedUsers.add(email);
    }
  }

  async onSubmit() {
    if (this.noteForm.invalid) return;
    
    const targetType = this.noteForm.value.targetType;
    if (targetType === 'specific' && this.selectedUsers.size === 0) {
      alert('Selecione pelo menos um usuário para enviar a notificação.');
      return;
    }

    this.isLoading.set(true);
    try {
      const { error } = await supabase
        .from('xml_notifications')
        .insert({
          title: this.noteForm.value.title,
          message: this.noteForm.value.message,
          target_type: targetType,
          target_users: targetType === 'all' ? [] : Array.from(this.selectedUsers),
          created_by: localStorage.getItem('userEmail') || 'system'
        });

      if (error) throw error;

      this.showSuccess.set(true);
      this.noteForm.reset({ targetType: 'all' });
      this.selectedUsers.clear();
      await this.fetchNotifications();
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteNotification(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta notificação?')) return;

    try {
      const { error } = await supabase
        .from('xml_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      this.history.update(notes => notes.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }
}
