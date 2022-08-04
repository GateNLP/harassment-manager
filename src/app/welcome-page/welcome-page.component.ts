/**
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { LiveAnnouncer } from '@angular/cdk/a11y';
import {Component, OnInit} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
  import {ActivatedRouteSnapshot, Params, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import { FirestoreService } from '../firestore.service';
import { OauthApiService } from '../oauth_api.service';
import { ActivatedRoute } from '@angular/router';
import {
} from "../create-report/create-report.component";
import {DashboardParamService} from "../dashboard-param-service";
import {first, map, Observable, tap} from "rxjs";

@Component({
  selector: 'app-welcome-page',
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss'],
})

export class WelcomePageComponent implements OnInit {

  // @ts-ignore
  screenName: string;
  // @ts-ignore
  dashboard: string;
  // @ts-ignore
  tweetId: string;
  // @ts-ignore
  fromDate: string;
  // @ts-ignore
  toDate: string;
  // @ts-ignore
  filterQuery: string;

  constructor(
    private firestoreService: FirestoreService,
    private oauthApiService: OauthApiService,
    private dashboardParamService: DashboardParamService,
    private sanitizer: DomSanitizer,
    private iconRegistry: MatIconRegistry,
    private router: Router,
    private liveAnnouncer: LiveAnnouncer,
    private route: ActivatedRoute
  ) {
    this.iconRegistry.addSvgIcon(
      'twitter_icon',
      this.sanitizer.bypassSecurityTrustResourceUrl(
        '/Twitter_Logo_WhiteOnBlue.svg'
      )
    );
  }

  loginWithTwitter(): void {
    this.oauthApiService.authenticateTwitter().then(async () => {
      this.liveAnnouncer.announce('Logged in. Exited Twitter login page.');
      await this.firestoreService.createUserDocument();

      this.router.navigate(['/gate-home']);
    });
  }

  retrieveAuthDetails(): void {
    let incomingCredentials = localStorage.getItem("fbase_user")
    this.oauthApiService.setTwitterCredentials(JSON.parse(<string>incomingCredentials))
    this.firestoreService.createUserDocument().then(()=>{
      this.router.navigate(['/gate-home'])
    })
  }

  ngOnInit() {
    this.route.queryParams.subscribe((params: any) => {
      const dashboardParams = {
        tweetId : params.tweetId ? params.tweetId : "",
        screenName : params.screenName ? params.screenName : "",
        dashboard : params.dashboard ? params.dashboard : "",
        fromDate : params.fromDate ? params.fromDate : "",
        toDate : params.toDate ? params.toDate : "",
        filterQuery : params.filterQuery ? params.filterQuery : "",
      }
      this.dashboardParamService.setDashboardParams(dashboardParams)
    });

    let authState = this.oauthApiService.getAuthStatus()
    if (authState) {
      this.retrieveAuthDetails()
    }

  }
}
