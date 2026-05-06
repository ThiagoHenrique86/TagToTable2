import {ChangeDetectionStrategy, Component, signal, ElementRef, ViewChild, computed, inject, PLATFORM_ID} from '@angular/core';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {FormsModule, ReactiveFormsModule, FormControl, FormGroup} from '@angular/forms';
import {MatIconModule} from '@angular/material/icon';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { createExtractorFromData } from 'node-unrar-js';
import {supabase} from './supabase';

interface FileEntry {
  name: string;
  size: string;
  sizeBytes: number;
  status: string;
  content?: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-converter',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule],
  template: `
    <div class="max-w-6xl mx-auto">
      <!-- Page Header -->
      <div class="mb-10">
        <h1 class="text-4xl font-headline font-extrabold text-primary tracking-tight mb-2">Transformador XML para Excel</h1>
        <p class="text-on-surface-variant font-medium">Processe em lote esquemas XML empresariais em pastas de trabalho Excel estruturadas.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <!-- Left Column -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Upload Area -->
          <div class="relative group">
            <div class="absolute -inset-1 bg-gradient-to-r from-primary/5 to-tertiary-fixed/20 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <div (click)="fileInput.click()" 
                 (keydown.enter)="fileInput.click()" 
                 (dragover)="onDragOver($event)"
                 (dragenter)="onDragEnter($event)"
                 (dragleave)="onDragLeave($event)"
                 (drop)="onDrop($event)"
                 [class.border-primary]="isDragging()"
                 [class.bg-primary/5]="isDragging()"
                 tabindex="0" 
                 class="relative surface-container-low rounded-xl p-12 flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/50 hover:border-tertiary-fixed transition-all cursor-pointer bg-white upload-pattern">
              <input #fileInput type="file" (change)="onFileSelected($event)" multiple accept=".xml,.zip,.rar" class="hidden">
              <div class="w-16 h-16 bg-primary-container/10 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                <mat-icon class="text-primary text-4xl">cloud_upload</mat-icon>
              </div>
              <h3 class="text-xl font-headline font-bold text-primary mb-2">Arraste e solte arquivos XML</h3>
              <p class="text-on-surface-variant text-sm mb-6">Suporte para arquivos .xml, .zip, .rar de até 2GB</p>
              <button class="bg-surface-container-high px-6 py-2 rounded-lg font-bold text-primary text-sm hover:bg-primary hover:text-white transition-colors">Procurar Arquivos</button>
            </div>
          </div>
          <!-- Files List -->
          <div class="bg-white rounded-xl p-6 shadow-sm border border-outline-variant/10">
            <div class="flex justify-between items-center mb-6">
              <h3 class="font-headline font-bold text-primary flex items-center gap-2">
                <mat-icon class="text-xl">folder_zip</mat-icon> Arquivos Prontos para Conversão
              </h3>
              <div class="flex items-center gap-3">
                @if (fileCount() > 0) {
                  <button (click)="clearFiles()" class="text-[10px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors uppercase tracking-wider">Limpar Lista</button>
                }
                <span class="text-xs font-bold px-2 py-1 bg-surface-container-high text-primary rounded uppercase tracking-wider">{{fileCount()}} Arquivos Adicionados</span>
              </div>
            </div>
            <div class="space-y-3">
              @for (file of paginatedFiles(); track i; let i = $index) {
                <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-lg group hover:bg-surface-container-high transition-colors">
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 bg-white rounded flex items-center justify-center border border-outline-variant/20 shadow-sm">
                      <mat-icon class="text-primary">code</mat-icon>
                    </div>
                    <div>
                      <p class="font-semibold text-primary text-sm">{{file.name}}</p>
                      <p class="text-xs text-on-surface-variant">{{file.size}} • {{file.status}}</p>
                    </div>
                  </div>
                  <button (click)="removeFile(i + (currentPage() * pageSize()))" class="text-on-surface-variant hover:text-red-600 transition-colors p-1">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              }
            </div>

            <!-- Pagination Controls -->
            @if (fileCount() > 0) {
              <div class="mt-6 pt-6 border-t border-outline-variant/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                  <span class="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Itens por página:</span>
                  <select [ngModel]="pageSize()" (ngModelChange)="onPageSizeChange($event)" class="bg-surface-container-high border-0 rounded text-xs font-bold text-primary py-1 px-2 focus:ring-1 focus:ring-primary outline-none">
                    @for (option of pageSizeOptions; track option) {
                      <option [value]="option">{{option}}</option>
                    }
                  </select>
                </div>
                
                <div class="flex items-center gap-2">
                  <button (click)="prevPage()" [disabled]="currentPage() === 0" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high disabled:opacity-30 transition-colors">
                    <mat-icon>chevron_left</mat-icon>
                  </button>
                  <span class="text-xs font-bold text-primary">Página {{currentPage() + 1}} de {{totalPages() || 1}}</span>
                  <button (click)="nextPage()" [disabled]="currentPage() >= totalPages() - 1" class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-high disabled:opacity-30 transition-colors">
                    <mat-icon>chevron_right</mat-icon>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Right Column (Settings) -->
        <div class="space-y-8" [formGroup]="settingsForm">
          <div class="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10 shadow-sm">
            <h3 class="font-headline font-bold text-primary mb-6 flex items-center gap-2">
              <mat-icon class="text-xl">settings_applications</mat-icon> Configurações de Exportação
            </h3>
            <div class="space-y-6">
              <!-- Filename -->
              <div class="space-y-2">
                <label for="filename-input" class="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Nome do Arquivo Excel</label>
                <div class="relative">
                  <input id="filename-input" formControlName="filename" class="w-full bg-white border-0 ring-1 ring-outline-variant/30 rounded-lg py-3 px-4 focus:ring-2 focus:ring-primary text-sm transition-shadow" type="text"/>
                  <span class="absolute right-3 top-3.5 text-xs font-bold text-on-surface-variant/50">.xlsx</span>
                </div>
              </div>

              <!-- Toggles -->
              <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-outline-variant/10">
                <div>
                  <p class="text-sm font-bold text-primary leading-tight">Agrupar por Leiaute</p>
                  <p class="text-[10px] text-on-surface-variant">Mesclar arquivos do mesmo tipo em abas</p>
                </div>
                <button (click)="settingsForm.patchValue({separateTabs: !settingsForm.value.separateTabs})" 
                        [class.bg-tertiary-fixed-dim]="settingsForm.value.separateTabs"
                        [class.bg-surface-container-high]="!settingsForm.value.separateTabs"
                        class="w-10 h-5 rounded-full relative flex items-center px-1 transition-colors">
                  <div [class.translate-x-4]="settingsForm.value.separateTabs"
                       class="w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform"></div>
                </button>
              </div>

              <div class="flex items-center justify-between p-4 bg-white rounded-lg border border-outline-variant/10">
                <div>
                  <p class="text-sm font-bold text-primary leading-tight">Preservar Tipos de Dados</p>
                  <p class="text-[10px] text-on-surface-variant">Forçar formatação de esquema</p>
                </div>
                <button (click)="settingsForm.patchValue({preserveTypes: !settingsForm.value.preserveTypes})" 
                        [class.bg-tertiary-fixed-dim]="settingsForm.value.preserveTypes"
                        [class.bg-surface-container-high]="!settingsForm.value.preserveTypes"
                        class="w-10 h-5 rounded-full relative flex items-center px-1 transition-colors">
                  <div [class.translate-x-4]="settingsForm.value.preserveTypes"
                       class="w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform"></div>
                </button>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <div class="sticky top-24">
            <button (click)="onConvert()" [disabled]="fileCount() === 0 || isConverting()" class="w-full py-5 rounded-xl bg-gradient-to-br from-tertiary-container to-on-tertiary-fixed-variant text-on-tertiary flex flex-col items-center justify-center gap-1 group relative overflow-hidden transition-transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              <div class="absolute inset-0 bg-tertiary-fixed opacity-0 group-hover:opacity-10 transition-opacity"></div>
              <div class="flex items-center gap-2 mb-1">
                <mat-icon class="text-2xl" [class.animate-spin]="isConverting()">{{ isConverting() ? 'sync' : 'table_view' }}</mat-icon>
                <span class="font-headline font-extrabold text-lg tracking-wide">{{ isConverting() ? 'Processando...' : 'Converter para Excel' }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading Overlay -->
    @if (isConverting()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md animate-in fade-in duration-300">
        <div class="bg-white p-10 rounded-3xl shadow-2xl border border-outline-variant/10 flex flex-col items-center gap-6 max-w-sm text-center">
          <div class="relative">
            <div class="w-20 h-20 border-4 border-primary/20 rounded-full"></div>
            <div class="absolute inset-0 w-20 h-20 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <mat-icon class="absolute inset-0 flex items-center justify-center text-primary text-3xl">table_view</mat-icon>
          </div>
          <div>
            <h3 class="text-2xl font-headline font-bold text-primary mb-2">Gerando Excel...</h3>
            <p class="text-on-surface-variant text-sm font-medium">Processando seus arquivos XML e estruturando as planilhas. Isso pode levar alguns segundos dependendo do volume de dados.</p>
          </div>
        </div>
      </div>
    }

    <!-- Extraction Overlay -->
    @if (isExtracting()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div class="bg-white p-8 rounded-2xl shadow-xl border border-outline-variant/10 flex items-center gap-4">
          <div class="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p class="font-bold text-primary">Extraindo arquivos do ZIP...</p>
        </div>
      </div>
    }

    <!-- Error Toast -->
    @if (errorMessage()) {
      <div class="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 duration-300">
        <div class="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border border-red-500/20">
          <mat-icon>error_outline</mat-icon>
          <span class="font-bold">{{errorMessage()}}</span>
          <button (click)="errorMessage.set(null)" class="ml-4 hover:bg-white/10 rounded-full p-1 transition-colors">
            <mat-icon class="text-sm">close</mat-icon>
          </button>
        </div>
      </div>
    }
  `,
})
export class Converter {
  private platformId = inject(PLATFORM_ID);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  files = signal<FileEntry[]>([]);
  fileCount = computed(() => this.files().length);
  
  // Pagination state
  currentPage = signal(0);
  pageSize = signal(5);
  pageSizeOptions = [5, 10, 20];
  
  paginatedFiles = computed(() => {
    const start = this.currentPage() * this.pageSize();
    const end = start + this.pageSize();
    return this.files().slice(start, end);
  });

  totalPages = computed(() => Math.ceil(this.fileCount() / this.pageSize()));
  
  isConverting = signal(false);
  isExtracting = signal(false);
  isDragging = signal(false);
  errorMessage = signal<string | null>(null);

  settingsForm = new FormGroup({
    filename: new FormControl('TagToTable_Export_' + new Date().toISOString().split('T')[0]),
    separateTabs: new FormControl(true),
    preserveTypes: new FormControl(false),
  });

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    await this.processFiles(Array.from(input.files));
    input.value = ''; // Reset input
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragEnter(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  async onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    if (event.dataTransfer?.files.length) {
      await this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  private async processFiles(fileList: File[]) {
    let hasInvalidFiles = false;
    for (const file of fileList) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.zip')) {
        await this.handleZipFile(file);
      } else if (fileName.endsWith('.rar')) {
        await this.handleRarFile(file);
      } else if (fileName.endsWith('.xml')) {
        await this.handleXmlFile(file);
      } else {
        hasInvalidFiles = true;
      }
    }
    
    if (hasInvalidFiles) {
      this.showError('Arquivo fora do padrão. Apenas .xml, .zip e .rar são permitidos.');
    }
  }

  private async handleXmlFile(file: File) {
    const content = await file.text();
    this.addFileEntry(file.name, file.size, content);
  }

  private async handleRarFile(file: File) {
    this.isExtracting.set(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Fetch the wasm binary from assets
      const wasmResponse = await fetch('/assets/unrar.wasm');
      if (!wasmResponse.ok) {
        throw new Error('Não foi possível carregar o motor de extração RAR.');
      }
      const wasmBinary = await wasmResponse.arrayBuffer();
      
      const extractor = await createExtractorFromData({ data: arrayBuffer, wasmBinary });
      const list = extractor.getFileList();
      const fileHeaders = [...list.fileHeaders];
      
      let xmlFound = false;
      for (const header of fileHeaders) {
        if (!header.flags.directory && header.name.toLowerCase().endsWith('.xml')) {
          const extracted = extractor.extract({ files: [header.name] });
          const fileData = [...extracted.files][0];
          if (fileData && fileData.extraction) {
            const content = new TextDecoder().decode(fileData.extraction);
            this.addFileEntry(header.name, header.unpSize, content);
            xmlFound = true;
          }
        }
      }
      
      if (!xmlFound) {
        this.showError('O arquivo RAR não contém arquivos XML válidos.');
      }
    } catch (error) {
      console.error('Error reading rar:', error);
      this.showError('Erro ao ler o arquivo RAR. Verifique se o arquivo não está protegido por senha ou corrompido.');
    } finally {
      this.isExtracting.set(false);
    }
  }

  private async handleZipFile(file: File) {
    this.isExtracting.set(true);
    try {
      const zip = await JSZip.loadAsync(file);
      let xmlFound = false;
      for (const [name, entry] of Object.entries(zip.files)) {
        const zipEntry = entry;
        if (!zipEntry.dir && name.toLowerCase().endsWith('.xml')) {
          const content = await zipEntry.async('string');
          this.addFileEntry(name, content.length, content);
          xmlFound = true;
        }
      }
      if (!xmlFound) {
        this.showError('O arquivo ZIP não contém arquivos XML válidos.');
      }
    } catch (error) {
      console.error('Error reading zip:', error);
      this.showError('Erro ao ler o arquivo ZIP. Verifique se o arquivo não está corrompido.');
    } finally {
      this.isExtracting.set(false);
    }
  }

  private addFileEntry(name: string, size: number, content: string) {
    const sizeStr = size > 1024 * 1024 
      ? (size / (1024 * 1024)).toFixed(1) + ' MB' 
      : (size / 1024).toFixed(1) + ' KB';
    
    this.files.update(f => [...f, { name, size: sizeStr, sizeBytes: size, status: 'Pronto', content }]);
  }

  removeFile(index: number) {
    this.files.update(f => f.filter((_, i) => i !== index));
    // Adjust current page if it's now out of bounds
    if (this.currentPage() >= this.totalPages() && this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  clearFiles() {
    this.files.set([]);
    this.currentPage.set(0);
  }

  onPageSizeChange(size: number) {
    this.pageSize.set(Number(size));
    this.currentPage.set(0);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages() - 1) {
      this.currentPage.update(p => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 0) {
      this.currentPage.update(p => p - 1);
    }
  }

  showError(message: string) {
    this.errorMessage.set(message);
    setTimeout(() => {
      if (this.errorMessage() === message) {
        this.errorMessage.set(null);
      }
    }, 5000);
  }

  async onConvert() {
    if (this.fileCount() === 0) return;
    this.isConverting.set(true);
    
    // Small delay to allow UI to show loading state before blocking main thread
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const workbook = XLSX.utils.book_new();
      const separateTabs = this.settingsForm.value.separateTabs;
      
      if (!separateTabs) {
        // Combined data in a single sheet
        const allData: Record<string, string | number>[] = [];

        for (const file of this.files()) {
          if (!file.content) continue;
          try {
            const rows = this.parseXmlToRows(file.content);
            rows.forEach(row => {
              allData.push({ ...row, _fileName: file.name });
            });
          } catch (fileError) {
            console.error(`Erro ao processar arquivo ${file.name}:`, fileError);
          }
        }

        if (allData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(allData);
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados Combinados');
        }
      } else {
        // Group by layout (XML root structure)
        const groups: Record<string, { rows: Record<string, string | number>[], codes: Set<string> }> = {};

        for (const file of this.files()) {
          if (!file.content) continue;
          
          try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(file.content, 'text/xml');
            const root = xmlDoc.documentElement;
            if (!root) continue;

            // Identify layout by root tag name (stripping namespace)
            const rootName = root.tagName.includes(':') ? root.tagName.split(':')[1] : root.tagName;
            
            // Extract 4-digit code from filename pattern "...-XXXX.xml"
            const codeMatch = file.name.match(/-(\d{4})\./);
            const code = codeMatch ? codeMatch[1] : '';
            
            const rows = this.parseXmlToRows(xmlDoc);
            
            if (!groups[rootName]) {
              groups[rootName] = { rows: [], codes: new Set() };
            }
            
            groups[rootName].rows.push(...rows);
            if (code) groups[rootName].codes.add(code);
            
          } catch (fileError) {
            console.error(`Erro ao processar arquivo ${file.name}:`, fileError);
          }
        }

        // Create a sheet for each layout group
        for (const [rootName, group] of Object.entries(groups)) {
          const sortedCodes = Array.from(group.codes).sort();
          // Sheet name is concatenated codes or root name if no codes found
          let sheetName = sortedCodes.join('') || rootName;
          
          // Excel sheet name limit is 31 chars and invalid characters: \ / ? * [ ] :
          sheetName = sheetName.substring(0, 31).replace(/[\\/?*[\]:]/g, '_');
          
          // Ensure unique sheet name within workbook
          let finalName = sheetName;
          let counter = 1;
          while (workbook.SheetNames.includes(finalName)) {
            const suffix = ` (${counter})`;
            finalName = sheetName.substring(0, 31 - suffix.length) + suffix;
            counter++;
          }

          const worksheet = XLSX.utils.json_to_sheet(group.rows);
          XLSX.utils.book_append_sheet(workbook, worksheet, finalName);
        }
      }

      const filename = (this.settingsForm.value.filename || 'Exportacao') + '.xlsx';
      XLSX.writeFile(workbook, filename);
      
      // Record export in database
      const totalSizeBytes = this.files().reduce((acc, f) => acc + f.sizeBytes, 0);
      await this.recordExport(filename, this.fileCount(), totalSizeBytes);

      // Update status
      this.files.update(fs => fs.map(f => ({ ...f, status: 'Convertido' })));
    } catch (error) {
      console.error('Conversion failed:', error);
    } finally {
      this.isConverting.set(false);
    }
  }

  private async recordExport(filename: string, xmlCount: number, totalSizeBytes: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    const email = localStorage.getItem('userEmail');
    if (!email) return;

    try {
      // Get user ID first
      const { data: userData, error: userError } = await supabase
        .from('xml_users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (userError) {
        console.error('Error finding user for export:', userError);
      }

      const exportData: {
        xml_count: number;
        filename: string;
        total_size_bytes: number;
        user_email: string;
        user_id?: string;
      } = {
        xml_count: xmlCount,
        filename: filename,
        total_size_bytes: totalSizeBytes,
        user_email: email
      };

      if (userData?.id) {
        exportData.user_id = userData.id;
      }

      const { error: insertError } = await supabase
        .from('xml_exports')
        .insert(exportData);

      if (insertError) {
        console.error('Error inserting export record:', insertError);
      }
    } catch (error) {
      console.error('Error recording export:', error);
    }
  }

  private parseXmlToRows(xmlInput: string | Document): Record<string, string | number>[] {
    let xmlDoc: Document;
    if (typeof xmlInput === 'string') {
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(xmlInput, 'text/xml');
    } else {
      xmlDoc = xmlInput;
    }
    
    if (!xmlDoc.documentElement) return [];

    const json = this.xmlToJson(xmlDoc.documentElement);
    const rows = this.getRows(json);
    
    // Ensure we return at least one empty row if something went wrong
    return rows.length > 0 ? rows : [{}];
  }

  private xmlToJson(node: Element): Record<string, unknown> | string | number {
    const obj: Record<string, unknown> = {};
    
    // Handle attributes
    if (node.attributes.length > 0) {
      for (const attr of Array.from(node.attributes)) {
        // Strip namespace from attribute name
        const attrName = attr.name.includes(':') ? attr.name.split(':')[1] : attr.name;
        
        // Ignore xsd, xsi, xmlns and schema URLs
        const lowerAttrName = attrName.toLowerCase();
        if (lowerAttrName === 'xsd' || lowerAttrName === 'xsi' || lowerAttrName === 'xmlns') continue;
        
        // Remove attributes that are schema URLs (http://www...)
        if (attr.value.startsWith('http://') || attr.value.startsWith('https://')) continue;
        
        obj[`@${attrName}`] = attr.value;
      }
    }

    const children = Array.from(node.children);
    if (children.length === 0) {
      const text = node.textContent?.trim() || '';
      
      const preserveTypes = this.settingsForm.value.preserveTypes;

      if (preserveTypes) {
        // Check for leading zeros (e.g., "001", "0123") - keep as string
        const hasLeadingZero = text.length > 1 && text.startsWith('0') && !text.startsWith('0.');
        
        // Check if it's a very large number string (e.g., "29309100000000") - keep as string to avoid scientific notation
        // Excel uses scientific notation for numbers with more than 11 digits
        const isLargeNumber = /^\d{11,}$/.test(text);

        if (hasLeadingZero || isLargeNumber) {
          if (Object.keys(obj).length > 0) {
            obj['#text'] = text;
            return obj;
          }
          return text;
        }
      }

      // Try to parse as number, handling potential decimal comma
      const normalizedText = text.replace(',', '.');
      const num = Number(normalizedText);
      const val = (!isNaN(num) && text !== '' && !text.includes('-')) ? num : text;
      
      if (Object.keys(obj).length > 0) {
        obj['#text'] = val;
        return obj;
      }
      return val;
    }

    children.forEach(child => {
      // Strip namespace from tag name
      const tagName = child.tagName.includes(':') ? child.tagName.split(':')[1] : child.tagName;
      
      // Ignore xsd, xsi, xmlns tags and Signature block
      const lowerTagName = tagName.toLowerCase();
      if (lowerTagName === 'xsd' || lowerTagName === 'xsi' || lowerTagName === 'xmlns' || lowerTagName === 'signature') return;

      const childValue = this.xmlToJson(child);

      if (obj[tagName]) {
        if (!Array.isArray(obj[tagName])) {
          obj[tagName] = [obj[tagName]];
        }
        (obj[tagName] as unknown[]).push(childValue);
      } else {
        obj[tagName] = childValue;
      }
    });

    return obj;
  }

  private getRows(data: unknown, path = ''): Record<string, string | number>[] {
    if (typeof data !== 'object' || data === null) {
      // Leaf node: return a row with the current path as key
      return [{ [path]: data as unknown as string | number }];
    }

    const dataObj = data as Record<string, unknown>;
    const keys = Object.keys(dataObj);
    
    if (keys.length === 0) {
      return [{}];
    }

    let rows: Record<string, string | number>[] = [{}];

    for (const key of keys) {
      const value = dataObj[key];
      // Build the path. Skip '#text' and use parent path for values of elements with attributes.
      let newPath = path;
      if (key === '#text') {
        // Use parent path for the text content
      } else {
        // Remove retornoProcessamentoDownload from key
        const cleanKey = key.replace(/retornoProcessamentoDownload/g, '');
        if (cleanKey) {
          newPath = path ? `${path}.${cleanKey}` : cleanKey;
        } else {
          newPath = path;
        }
      }

      const expandedRows: Record<string, string | number>[] = [];

      if (Array.isArray(value)) {
        // Repeating element: expand rows (Cartesian product)
        for (const item of value) {
          const itemRows = this.getRows(item, newPath);
          for (const row of rows) {
            for (const itemRow of itemRows) {
              expandedRows.push({ ...row, ...itemRow });
            }
          }
        }
        rows = expandedRows;
      } else {
        // Singular element or object: merge into current rows
        const subRows = this.getRows(value, newPath);
        for (const row of rows) {
          for (const subRow of subRows) {
            expandedRows.push({ ...row, ...subRow });
          }
        }
        rows = expandedRows;
      }
      
      // Safety check: if expandedRows became empty (shouldn't happen), preserve current rows
      if (rows.length === 0) {
        rows = [{}];
      }
    }

    return rows;
  }
}
