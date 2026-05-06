import {ChangeDetectionStrategy, Component, signal, inject, PLATFORM_ID, OnInit} from '@angular/core';
import {RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd} from '@angular/router';
import {MatIconModule} from '@angular/material/icon';
import {CommonModule, isPlatformBrowser} from '@angular/common';
import {filter} from 'rxjs/operators';
import packageInfo from '../../package.json';
import {supabase} from './supabase';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  targetType: 'all' | 'specific';
  targetUsers: string[];
  isRead?: boolean;
}

interface UserPermission {
  can_view_dashboard: boolean;
  can_view_converter: boolean;
  can_view_change_password: boolean;
  can_view_settings: boolean;
  can_manage_requests: boolean;
  can_manage_notifications: boolean;
  can_manage_users: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  router = inject(Router);
  platformId = inject(PLATFORM_ID);
  
  get profileImageUrl() {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('userAvatar') || null;
    }
    return null;
  }

  isSidebarOpen = signal(false);
  appVersion = signal(packageInfo.version);
  currentYear = new Date().getFullYear();

  menuItems = [
    {path: '/', icon: 'swap_horiz', label: 'Conversor', roles: ['user', 'manager', 'admin']},
    {path: '/history', icon: 'history', label: 'Histórico', roles: ['manager', 'admin']},
    {path: '/requests', icon: 'person_add', label: 'Solicitações', roles: ['admin']},
    {path: '/notifications', icon: 'notifications', label: 'Notificações', roles: ['admin']},
    {path: '/users', icon: 'group', label: 'Usuários', roles: ['admin']},
    {path: '/settings', icon: 'settings', label: 'Configurações', roles: ['user', 'manager', 'admin']},
  ];

  notifications = signal<Notification[]>([]);
  isNotificationOpen = signal(false);
  unreadCount = signal(0);
  permissions = signal<UserPermission>({
    can_view_dashboard: false,
    can_view_converter: false,
    can_view_change_password: false,
    can_view_settings: false,
    can_manage_requests: false,
    can_manage_notifications: false,
    can_manage_users: false
  });

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await Promise.all([
        this.fetchNotifications(),
        this.fetchPermissions()
      ]);
      
      // Refresh notifications on route change (e.g., after login)
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe(() => {
        this.fetchNotifications();
        this.fetchPermissions();
      });

      // Poll for new notifications every minute
      setInterval(() => this.fetchNotifications(), 60000);
    }
  }

  async fetchNotifications() {
    const email = this.getUserEmail();
    if (email === 'Usuário') return;

    try {
      // 1. Fetch notifications
      const { data: notes, error: notesError } = await supabase
        .from('xml_notifications')
        .select('*')
        .or(`target_type.eq.all,target_users.cs.{"${email}"}`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (notesError) throw notesError;

      if (notes) {
        // 2. Fetch read status for these notifications
        const noteIds = notes.map((n: any) => n.id);
        const { data: reads, error: readsError } = await supabase
          .from('xml_notification_reads')
          .select('notification_id')
          .eq('user_email', email)
          .in('notification_id', noteIds);

        if (readsError) throw readsError;

        const readIds = new Set(reads?.map((r: any) => r.notification_id) || []);
        
        const newNotes = notes.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          createdAt: n.created_at,
          targetType: n.target_type,
          targetUsers: n.target_users || [],
          isRead: readIds.has(n.id)
        }));

        this.notifications.set(newNotes);
        this.unreadCount.set(newNotes.filter((n: any) => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }

  async fetchPermissions() {
    const userId = this.getUserId();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('xml_permissions')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          // Create default permissions if they don't exist
          const { data: newData, error: createError } = await supabase
            .from('xml_permissions')
            .insert({ 
              user_id: userId,
              can_view_dashboard: true,
              can_view_converter: true,
              can_view_change_password: true,
              can_view_settings: false
            })
            .select()
            .single();
          
          if (!createError && newData) {
            this.permissions.set(newData);
          }
        } else {
          throw error;
        }
      }
      if (data) {
        this.permissions.set(data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  }

  async markAsRead(notificationId: string) {
    const email = this.getUserEmail();
    if (email === 'Usuário') return;

    // Only mark as read if not already read
    const note = this.notifications().find(n => n.id === notificationId);
    if (note?.isRead) return;

    try {
      const { error } = await supabase
        .from('xml_notification_reads')
        .upsert({ notification_id: notificationId, user_email: email });
      
      if (error) throw error;
      
      // Update local state
      this.notifications.update(notes => 
        notes.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      this.unreadCount.update(c => Math.max(0, c - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  toggleNotifications() {
    this.isNotificationOpen.update(v => !v);
  }

  isLoggedIn() {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('isLoggedIn') === 'true';
    }
    return false;
  }

  getUserRole() {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('userRole') || 'user';
    }
    return 'user';
  }

  getUserId() {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('userId') || null;
    }
    return null;
  }

  getUserEmail() {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('userEmail') || 'Usuário';
    }
    return 'Usuário';
  }

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear(); // Clear everything to ensure clean state for next user
    }
    this.router.navigate(['/login']);
  }
}
