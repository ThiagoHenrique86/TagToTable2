import {Routes, CanActivateFn, Router} from '@angular/router';
import {inject, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {Converter} from './converter';
import {History} from './history';
import {Login} from './login';
import {RequestAccess} from './request-access';
import {Settings} from './settings';
import {ChangePassword} from './change-password';
import {Requests} from './requests';
import {Notifications} from './notifications';
import {Users} from './users';

const authGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  
  if (isPlatformBrowser(platformId)) {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userRole = localStorage.getItem('userRole');

    if (!isLoggedIn) {
      router.navigate(['/login']);
      return false;
    }

    // Role-based access control
    const restrictedRoutes = ['history', 'requests', 'notifications', 'users'];
    const path = route.url[0]?.path;

    if (userRole === 'user' && restrictedRoutes.includes(path)) {
      router.navigate(['/']);
      return false;
    }
  }
  return true;
};

export const routes: Routes = [
  {path: 'login', component: Login},
  {path: 'request-access', component: RequestAccess},
  {path: '', component: Converter, canActivate: [authGuard]},
  {path: 'history', component: History, canActivate: [authGuard]},
  {path: 'settings', component: Settings, canActivate: [authGuard]},
  {path: 'change-password', component: ChangePassword, canActivate: [authGuard]},
  {path: 'requests', component: Requests, canActivate: [authGuard]},
  {path: 'notifications', component: Notifications, canActivate: [authGuard]},
  {path: 'users', component: Users, canActivate: [authGuard]},
  {path: '**', redirectTo: ''},
];
