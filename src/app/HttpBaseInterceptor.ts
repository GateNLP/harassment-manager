import {Injectable} from "@angular/core";
import { environment } from '../environments/environment';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from "@angular/common/http";
import {Observable} from "rxjs";

@Injectable()
export class HttpBaseInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        if(environment.baseHref === "/"){
            return next.handle(req)
        }
        const url = environment.baseHref;
        req = req.clone({
            url: url + req.url
        });
        return next.handle(req)
    }
}