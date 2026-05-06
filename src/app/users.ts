import {ChangeDetectionStrategy, Component, signal, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {FormsModule, ReactiveFormsModule, FormControl, FormGroup, Validators} from '@angular/forms';
import {supabase} from './supabase';

interface User {
  id: string;
  created_at: string;
  email: string;
  name: string;
  cpf: string;
  phone: string;
  role: 'admin' | 'manager' | 'user';
  status: 'Ativo' | 'Inativo';
  expiration_date: string | null;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-users',
  imports: [CommonModule, MatIconModule, FormsModule, ReactiveFormsModule],
  template: `
    <header class="mb-10 flex justify-between items-end">
      <div>
        <h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">Gestão de Usuários</h1>
        <p class="text-on-surface-variant font-medium">Controle o acesso, permissões e status dos colaboradores.</p>
      </div>
      <button (click)="openCreateModal()" class="px-6 py-3 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-wide shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center gap-2">
        <mat-icon>person_add</mat-icon> Novo Usuário
      </button>
    </header>

    <!-- Users Table -->
    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
      <div class="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
        <div class="relative flex-1 max-w-md">
          <mat-icon class="absolute left-3 top-2.5 text-on-surface-variant/50">search</mat-icon>
          <input type="text" [(ngModel)]="searchTerm" (input)="filterUsers()" placeholder="Buscar por nome, e-mail ou CPF..." 
                 class="w-full bg-white border-0 ring-1 ring-outline-variant/30 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
        </div>
        <div class="flex items-center gap-2">
          <button (click)="fetchUsers()" class="p-2 hover:bg-surface-container-high rounded-full transition-colors text-primary">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/50">
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold border-b-2 border-tertiary-fixed-dim">Usuário</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Contato</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Função</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Status</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10">
            @for (user of filteredUsers(); track user.id) {
              <tr class="hover:bg-surface-container-low transition-colors group">
                <td class="px-6 py-5">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <mat-icon>person</mat-icon>
                    </div>
                    <div>
                      <div class="font-bold text-primary">{{ user.name || 'Sem Nome' }}</div>
                      <div class="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">CPF: {{ formatCpf(user.cpf) }}</div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-5">
                  <div class="text-xs text-on-surface font-medium">{{ user.email }}</div>
                  <div class="text-[10px] text-on-surface-variant">{{ formatPhone(user.phone) }}</div>
                </td>
                <td class="px-6 py-5">
                  <span [class.bg-primary/10]="user.role === 'admin'"
                        [class.text-primary]="user.role === 'admin'"
                        [class.bg-amber-100]="user.role === 'manager'"
                        [class.text-amber-700]="user.role === 'manager'"
                        [class.bg-surface-container-high]="user.role === 'user'"
                        [class.text-on-surface-variant]="user.role === 'user'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {{ user.role === 'admin' ? 'Administrador' : (user.role === 'manager' ? 'Gerente' : 'Operador') }}
                  </span>
                </td>
                <td class="px-6 py-5">
                  <div class="flex flex-col gap-1">
                    <span [class.bg-emerald-100]="user.status === 'Ativo'"
                          [class.text-emerald-700]="user.status === 'Ativo'"
                          [class.bg-red-100]="user.status === 'Inativo'"
                          [class.text-red-700]="user.status === 'Inativo'"
                          class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest w-fit">
                      {{ user.status }}
                    </span>
                    @if (user.expiration_date) {
                      <span class="text-[9px] text-on-surface-variant font-bold uppercase tracking-tighter">Expira: {{ user.expiration_date | date:'dd/MM/yy' }}</span>
                    }
                  </div>
                </td>
                <td class="px-6 py-5 text-right">
                  <div class="flex justify-end gap-2">
                    <button (click)="openEditModal(user)" class="p-2 text-primary hover:bg-primary/5 rounded-lg transition-colors" title="Editar">
                      <mat-icon class="text-sm">edit</mat-icon>
                    </button>
                    <button (click)="toggleStatus(user)" class="p-2 text-on-surface-variant hover:bg-surface-container-low rounded-lg transition-colors" [title]="user.status === 'Ativo' ? 'Desativar' : 'Ativar'">
                      <mat-icon class="text-sm">{{ user.status === 'Ativo' ? 'block' : 'check_circle' }}</mat-icon>
                    </button>
                    <button (click)="deleteUser(user.id)" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
                      <mat-icon class="text-sm">delete</mat-icon>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-10 text-center text-on-surface-variant italic text-sm">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- User Modal -->
    @if (isModalOpen()) {
      <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
        <div class="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden animate-in zoom-in-95 duration-200">
          <div class="px-8 py-6 border-b border-outline-variant/10 bg-surface-container-low/30 flex justify-between items-center">
            <h3 class="font-headline font-bold text-primary">{{ editingUser() ? 'Editar Usuário' : 'Novo Usuário' }}</h3>
            <button (click)="closeModal()" class="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          
          <form [formGroup]="userForm" (ngSubmit)="onSubmit()" class="p-8 space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-2">
                <label for="userName" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Nome Completo</label>
                <input id="userName" formControlName="name" type="text" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>
              
              <div class="space-y-2">
                <label for="userEmail" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">E-mail</label>
                <input id="userEmail" formControlName="email" type="email" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>
              
              <div class="space-y-2">
                <label for="userCpf" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">CPF (Apenas números)</label>
                <input id="userCpf" formControlName="cpf" type="text" maxlength="11" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>
              
              <div class="space-y-2">
                <label for="userPhone" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Telefone (DDD + Número)</label>
                <input id="userPhone" formControlName="phone" type="text" maxlength="11" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>

              <div class="space-y-2">
                <label for="userRole" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Função / Cargo</label>
                <select id="userRole" formControlName="role" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
                  <option value="user">Operador</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div class="space-y-2">
                <label for="userExpiration" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Data de Expiração (Opcional)</label>
                <input id="userExpiration" formControlName="expiration_date" type="date" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
              </div>
              
              @if (!editingUser()) {
                <div class="space-y-2">
                  <label for="userPassword" class="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Senha Inicial</label>
                  <input id="userPassword" formControlName="password" type="text" class="w-full bg-surface-container-low border-0 ring-1 ring-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow">
                </div>
              }
            </div>

            <div class="pt-6 border-t border-outline-variant/10 flex justify-end gap-4">
              <button type="button" (click)="closeModal()" class="px-6 py-3 rounded-xl text-primary font-bold text-sm hover:bg-surface-container-low transition-colors">Cancelar</button>
              <button type="submit" [disabled]="userForm.invalid || isLoading()" class="px-8 py-3 rounded-xl bg-primary text-on-primary font-headline font-bold tracking-wide shadow-md hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50">
                {{ isLoading() ? 'Salvando...' : 'Salvar Usuário' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Success Toast -->
    @if (showSuccess()) {
      <div class="fixed bottom-8 right-8 bg-primary text-on-primary px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300">
        <mat-icon>check_circle</mat-icon>
        <span class="font-bold text-sm">Operação realizada com sucesso!</span>
      </div>
    }
  `,
})
export class Users implements OnInit {
  private platformId = inject(PLATFORM_ID);
  
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  searchTerm = '';
  
  isLoading = signal(false);
  isModalOpen = signal(false);
  editingUser = signal<User | null>(null);
  showSuccess = signal(false);

  userForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    name: new FormControl('', [Validators.required]),
    cpf: new FormControl('', [Validators.required, Validators.minLength(11)]),
    phone: new FormControl('', [Validators.required, Validators.minLength(10)]),
    role: new FormControl('user', [Validators.required]),
    status: new FormControl('Ativo'),
    expiration_date: new FormControl(''),
    password: new FormControl(''),
  });

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.fetchUsers();
    }
  }

  async fetchUsers() {
    this.isLoading.set(true);
    try {
      const { data, error } = await supabase
        .from('xml_users')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) {
        this.users.set(data as User[]);
        this.filterUsers();
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  filterUsers() {
    if (!this.searchTerm) {
      this.filteredUsers.set(this.users());
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers.set(this.users().filter(u => 
      u.name?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term) || 
      u.cpf?.includes(term)
    ));
  }

  openCreateModal() {
    this.editingUser.set(null);
    this.userForm.reset({ role: 'user', status: 'Ativo', password: Math.random().toString(36).slice(-8) });
    this.userForm.get('password')?.setValidators([Validators.required]);
    this.isModalOpen.set(true);
  }

  openEditModal(user: User) {
    this.editingUser.set(user);
    this.userForm.patchValue({
      email: user.email,
      name: user.name,
      cpf: user.cpf,
      phone: user.phone,
      role: user.role,
      status: user.status,
      expiration_date: user.expiration_date ? user.expiration_date.split('T')[0] : '',
    });
    this.userForm.get('password')?.clearValidators();
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingUser.set(null);
  }

  async onSubmit() {
    if (this.userForm.invalid) return;

    this.isLoading.set(true);
    try {
      const formValue = this.userForm.value;
      const userData = {
        email: formValue.email,
        name: formValue.name,
        cpf: formValue.cpf?.replace(/\D/g, ''),
        phone: formValue.phone?.replace(/\D/g, ''),
        role: formValue.role,
        status: formValue.status,
        expiration_date: formValue.expiration_date || null,
      };

      if (this.editingUser()) {
        const { error } = await supabase
          .from('xml_users')
          .update(userData)
          .eq('id', this.editingUser()?.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('xml_users')
          .insert({ ...userData, password: formValue.password });
        if (error) throw error;
      }

      this.showSuccess.set(true);
      this.closeModal();
      await this.fetchUsers();
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (error) {
      console.error('Error saving user:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async toggleStatus(user: User) {
    const newStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    try {
      const { error } = await supabase
        .from('xml_users')
        .update({ status: newStatus })
        .eq('id', user.id);

      if (error) throw error;
      
      this.users.update(us => us.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      this.filterUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  }

  async deleteUser(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuário permanentemente?')) return;

    try {
      const { error } = await supabase
        .from('xml_users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      this.users.update(us => us.filter(u => u.id !== id));
      this.filterUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  }

  formatCpf(cpf: string) {
    return cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') || '';
  }

  formatPhone(phone: string) {
    if (!phone) return '';
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
}
