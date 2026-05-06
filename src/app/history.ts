import {ChangeDetectionStrategy, Component, signal, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {MatIconModule} from '@angular/material/icon';
import {supabase} from './supabase';
import {FormsModule} from '@angular/forms';

interface ExportRecord {
  id: string;
  created_at: string;
  xml_count: number;
  filename: string;
  total_size_bytes: number;
  user_email: string;
  user_id: string;
  users?: {
    name: string;
  };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-history',
  imports: [CommonModule, MatIconModule, FormsModule],
  template: `
    <header class="mb-10">
      <h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">Histórico de Conversão</h1>
      <p class="text-on-surface-variant font-medium">Acompanhe e gerencie suas transformações de dados em escala empresarial.</p>
    </header>

    <!-- Stats Grid -->
    <div class="grid grid-cols-12 gap-6 mb-10">
      <div class="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/10">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <mat-icon>transform</mat-icon>
          </div>
          <h3 class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Total Processado</h3>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-primary">{{ totalProcessed() }}</span>
          <span class="text-emerald-600 text-xs font-semibold">Arquivos</span>
        </div>
      </div>

      <div class="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/10">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 rounded-lg bg-tertiary/10 flex items-center justify-center text-tertiary">
            <mat-icon>storage</mat-icon>
          </div>
          <h3 class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Dados Convertidos</h3>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-primary">{{ formatBytes(totalDataSize()) }}</span>
          <span class="text-emerald-600 text-xs font-semibold">Otimizado</span>
        </div>
      </div>

      <div class="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/10">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <mat-icon>check_circle</mat-icon>
          </div>
          <h3 class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Taxa de Sucesso</h3>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-primary">100%</span>
          <span class="text-emerald-600 text-xs font-semibold">Estável</span>
        </div>
      </div>

      <div class="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-outline-variant/10">
        <div class="flex items-center gap-4 mb-4">
          <div class="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
            <mat-icon>speed</mat-icon>
          </div>
          <h3 class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Tempo Médio</h3>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-primary">1.2s</span>
          <span class="text-emerald-600 text-xs font-semibold">Eficiente</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-12 gap-6 mb-10">
      <div class="col-span-12 bg-white p-6 rounded-xl shadow-sm flex flex-col justify-between border border-outline-variant/10">
        <div>
          <h3 class="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-4">Volume de Transformação (Últimos 7 dias)</h3>
          <div class="flex items-baseline gap-2">
            <span class="text-4xl font-extrabold text-primary">Atividade Recente</span>
          </div>
        </div>
        <div class="mt-6 flex gap-2 h-32 items-end">
          @for (day of weeklyActivity(); track day.label) {
            <div class="flex-1 bg-surface-container-high rounded-t-lg hover:bg-primary/20 transition-all cursor-help relative group" 
                 [style.height.%]="day.percentage"
                 [class.bg-primary]="day.isToday">
              <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                {{ day.label }}: {{ day.count }}
              </div>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- Table -->
    <section class="bg-white rounded-xl shadow-sm overflow-hidden border border-outline-variant/10">
      <div class="px-6 py-4 border-b border-outline-variant/10 flex flex-col sm:flex-row justify-between items-center bg-surface-container-low/30 gap-4">
        <h2 class="font-headline font-bold text-primary">Exportações Recentes</h2>
        <div class="flex flex-wrap gap-2 items-center">
          @if (isPrivileged()) {
            <div class="flex items-center gap-2 bg-white border border-outline-variant/30 rounded px-2 py-1">
              <mat-icon class="text-sm text-on-surface-variant">person_search</mat-icon>
              <select [(ngModel)]="userFilter" (change)="fetchHistory()" class="text-xs font-semibold bg-transparent border-0 outline-none text-primary">
                <option value="">Todos os Usuários</option>
                @for (user of users(); track user.id) {
                  <option [value]="user.email">{{ user.name || user.email }}</option>
                }
              </select>
            </div>
          }
          <button (click)="fetchHistory()" class="text-xs font-semibold px-3 py-1.5 rounded bg-white text-primary border border-outline-variant/30 hover:bg-surface-container-low transition-colors flex items-center gap-1">
            <mat-icon class="text-sm">refresh</mat-icon> Atualizar
          </button>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low/50">
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold border-b-2 border-tertiary-fixed-dim">Data e Hora</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Arquivos de Origem</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Nome do Arquivo de Saída</th>
              <th class="px-6 py-4 text-[10px] uppercase tracking-widest text-primary font-bold">Usuário</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-outline-variant/10">
            @for (entry of history(); track entry.id) {
              <tr class="hover:bg-surface-container-low transition-colors group">
                <td class="px-6 py-5">
                  <div class="font-semibold text-on-surface">{{ entry.created_at | date:'dd MMM, yyyy' }}</div>
                  <div class="text-[10px] text-on-surface-variant">{{ entry.created_at | date:'HH:mm' }}</div>
                </td>
                <td class="px-6 py-5">
                  <span class="inline-flex items-center gap-1.5 bg-surface-container-high text-primary px-2 py-0.5 rounded-sm text-xs font-medium">
                    <mat-icon class="text-[14px]">terminal</mat-icon> {{ entry.xml_count }} Arquivos XML
                  </span>
                </td>
                <td class="px-6 py-5">
                  <div class="font-medium text-primary">{{ entry.filename }}</div>
                  <div class="text-[10px] text-on-surface-variant uppercase tracking-tight">{{ formatBytes(entry.total_size_bytes) }} • FORMATO XLSX</div>
                </td>
                <td class="px-6 py-5">
                  <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <mat-icon class="text-xs">person</mat-icon>
                    </div>
                    <span class="text-xs font-medium text-on-surface">{{ entry.users?.name || entry.user_email }}</span>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="px-6 py-10 text-center text-on-surface-variant italic text-sm">
                  Nenhuma exportação encontrada.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      <div class="px-6 py-4 bg-surface-container-low/20 border-t border-outline-variant/10 flex justify-between items-center">
        <p class="text-[10px] uppercase tracking-widest text-on-surface-variant">Mostrando {{ history().length }} entradas</p>
      </div>
    </section>
  `,
})
export class History implements OnInit {
  private platformId = inject(PLATFORM_ID);
  
  history = signal<ExportRecord[]>([]);
  users = signal<{id: string, email: string, name: string}[]>([]);
  userFilter = '';
  
  totalProcessed = signal(0);
  totalDataSize = signal(0);
  weeklyActivity = signal<{label: string, count: number, percentage: number, isToday: boolean}[]>([]);

  isPrivileged() {
    if (isPlatformBrowser(this.platformId)) {
      const role = localStorage.getItem('userRole');
      return role === 'admin' || role === 'manager';
    }
    return false;
  }

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.fetchHistory();
      if (this.isPrivileged()) {
        await this.fetchUsers();
      }
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

  async fetchHistory() {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      let query = supabase
        .from('xml_exports')
        .select('*, xml_users(name)')
        .order('created_at', { ascending: false });

      const email = localStorage.getItem('userEmail');
      const role = localStorage.getItem('userRole');

      if (role !== 'admin' && role !== 'manager') {
        query = query.eq('user_email', email);
      } else if (this.userFilter) {
        query = query.eq('user_email', this.userFilter);
      }

      const { data, error } = await query.limit(50);

      if (error) {
        console.error('Supabase error fetching history:', error);
        throw error;
      }
      if (data) {
        this.history.set(data as ExportRecord[]);
        this.calculateStats(data as ExportRecord[]);
      }
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }

  calculateStats(data: ExportRecord[]) {
    // Total processed
    const total = data.reduce((acc, curr) => acc + curr.xml_count, 0);
    this.totalProcessed.set(total);

    // Total data size
    const size = data.reduce((acc, curr) => acc + curr.total_size_bytes, 0);
    this.totalDataSize.set(size);

    // Weekly activity
    const last7Days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const count = data
        .filter(record => {
          const recordDate = new Date(record.created_at);
          recordDate.setHours(0, 0, 0, 0);
          return recordDate.getTime() === date.getTime();
        })
        .reduce((acc, curr) => acc + curr.xml_count, 0);

      last7Days.push({
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        count: count,
        isToday: i === 0
      });
    }

    const maxCount = Math.max(...last7Days.map(d => d.count), 1);
    this.weeklyActivity.set(last7Days.map(d => ({
      ...d,
      percentage: (d.count / maxCount) * 100
    })));
  }

  formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
