import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SideNavCard } from '../../../components/side-nav-card/side-nav-card';
import { UserInfoCard } from '../../../components/user-info-card/user-info-card';
import { Footer } from '../../../components/footer/footer';
import { TopNavFilter } from '../../../components/top-nav-filter/top-nav-filter';
import { YourEarnings } from '../../../components/your-earnings/your-earnings';
import { TrendingAds } from '../../../components/trending-ads/trending-ads';

@Component({
  selector: 'app-home',
  imports: [RouterOutlet, SideNavCard, UserInfoCard, Footer, TopNavFilter, YourEarnings, TrendingAds],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
