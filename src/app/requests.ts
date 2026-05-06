import {ChangeDetectionStrategy, Component, signal, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {supabase} from './supabase';
import {FormsModule} from '@angular/forms';

interface AccessRequest {
  id: string;
  created_at: string;
  full_name: string;
  cpf: string;
  emails: string[];
  phones: string[];
  status: 'Pendente' | 'Aprovado' | 'Recusado';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-requests',
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <header class="mb-10">
      <h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">Solicitações de Acesso</h1>
      <p class="text-on-surface-variant font-medium">Gerencie os pedidos de novos usuários para a plataforma.</p>
    </header>

    <div class="bg-white rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
      <div class="px-6 py-4 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
        <h2 class="font-headline font-bold text-primary">Pedidos Pendentes</h2>
        <div class="flex items-center gap-2">
          <button (click)="fetchRequests()" class="text-xs font-semibold px-3 py-1.5 rounded bg-white text-primary border border-outline-variant/30 hover:bg-surface-container-low transition-colors flex items-center gap-1">
            <mat-icon class="text-sm">refresh</mat-icon> Atualizar
          </button>
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/50">
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold border-b-2 border-tertiary-fixed-dim">Data</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Solicitante</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Contato</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Status</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10">
            @for (req of requests(); track req.id) {
              <tr class="hover:bg-surface-container-low transition-colors group">
                <td class="px-6 py-5">
                  <div class="font-semibold text-on-surface text-sm">{{ req.created_at | date:'dd/MM/yyyy' }}</div>
                  <div class="text-[10px] text-on-surface-variant">{{ req.created_at | date:'HH:mm' }}</div>
                </td>
                <td class="px-6 py-5">
                  <div class="font-bold text-primary">{{ req.full_name }}</div>
                  <div class="text-[10px] text-on-surface-variant font-mono uppercase tracking-widest">CPF: {{ formatCpf(req.cpf) }}</div>
                </td>
                <td class="px-6 py-5">
                  <div class="flex flex-col gap-1">
                    @for (email of req.emails; track email) {
                      <div class="flex items-center gap-1 text-xs text-on-surface-variant">
                        <mat-icon class="text-[14px]">email</mat-icon> {{ email }}
                      </div>
                    }
                    @for (phone of req.phones; track phone) {
                      <div class="flex items-center gap-1 text-xs text-on-surface-variant">
                        <mat-icon class="text-[14px]">phone</mat-icon> {{ formatPhone(phone) }}
                      </div>
                    }
                  </div>
                </td>
                <td class="px-6 py-5">
                  <span [class.bg-amber-100]="req.status === 'Pendente'"
                        [class.text-amber-700]="req.status === 'Pendente'"
                        [class.bg-emerald-100]="req.status === 'Aprovado'"
                        [class.text-emerald-700]="req.status === 'Aprovado'"
                        [class.bg-red-100]="req.status === 'Recusado'"
                        [class.text-red-700]="req.status === 'Recusado'"
                        class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {{ req.status }}
                  </span>
                </td>
                <td class="px-6 py-5 text-right">
                  @if (req.status === 'Pendente') {
                    <div class="flex justify-end gap-2">
                      <button (click)="updateStatus(req.id, 'Recusado')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Recusar">
                        <mat-icon>close</mat-icon>
                      </button>
                      <button (click)="approveRequest(req)" class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Aprovar e Criar Usuário">
                        <mat-icon>check</mat-icon>
                      </button>
                    </div>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5" class="px-6 py-10 text-center text-on-surface-variant italic text-sm">
                  Nenhuma solicitação pendente.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Success Toast -->
    @if (showSuccess()) {
      <div class="fixed bottom-8 right-8 bg-primary text-on-primary px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-full duration-300">
        <mat-icon>check_circle</mat-icon>
        <span class="font-bold text-sm">Operação realizada com sucesso!</span>
      </div>
    }
  `,
})
export class Requests implements OnInit {
  private platformId = inject(PLATFORM_ID);
  
  requests = signal<AccessRequest[]>([]);
  isLoading = signal(false);
  showSuccess = signal(false);

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.fetchRequests();
    }
  }

  async fetchRequests() {
    this.isLoading.set(true);
    try {
      const { data, error } = await supabase
        .from('xml_access_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) this.requests.set(data as AccessRequest[]);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateStatus(id: string, status: 'Aprovado' | 'Recusado') {
    try {
      const { error } = await supabase
        .from('xml_access_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      
      this.requests.update(reqs => reqs.map(r => r.id === id ? { ...r, status } : r));
      this.showSuccess.set(true);
      setTimeout(() => this.showSuccess.set(false), 3000);
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  }

  async approveRequest(req: AccessRequest) {
    try {
      // 1. Create user
      const { error: userError } = await supabase
        .from('xml_users')
        .insert({
          email: req.emails[0],
          name: req.full_name,
          cpf: req.cpf,
          phone: req.phones[0],
          role: 'user',
          status: 'Ativo',
          password: Math.random().toString(36).slice(-8) // Generate random password
        });

      if (userError) throw userError;

      // 2. Update request status
      await this.updateStatus(req.id, 'Aprovado');
    } catch (error) {
      console.error('Error approving request:', error);
    }
  }

  formatCpf(cpf: string) {
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  formatPhone(phone: string) {
    if (phone.length === 11) {
      return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
}
