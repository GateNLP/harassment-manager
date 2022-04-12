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

import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  forkJoin,
  from,
  Observable,
  of,
  throwError,
} from 'rxjs';
import RateLimiter from 'rxjs-ratelimiter';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import {
  DashboardParams,
  GetTweetsResponse,
  ScoredItem,
  SocialMediaItem,
  Tweet,
} from 'src/common-types';
import { stripOutEntitiesFromItemText } from './common/social_media_item_utils';
import { OauthApiService } from './oauth_api.service';
import { PerspectiveApiService } from './perspectiveapi.service';
import { TwitterApiService } from './twitter_api.service';

export interface RequestCache {
  // The key to the cache is startDateTimeMs + '_' + endDateTimeMs.
  [key: string]: Observable<Array<ScoredItem<SocialMediaItem>>>;
}

@Injectable({ providedIn: 'root' })
export class DashboardParamService {
  
  private dashboardParams: DashboardParams = {
    fromDate: "",
    toDate: "",
    tweetId: "",
    screenName: "",
    index: "",
    filterQuery: ""
  }

  constructor() {
  }


  getDashboardParams() {
    return this.dashboardParams
  }

  setDashboardParams(dashboardParams: DashboardParams) {
    this.dashboardParams = dashboardParams
  }
}