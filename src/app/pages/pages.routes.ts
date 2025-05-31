import { Routes } from '@angular/router';
import { DocumentosComponent } from './documentos/documentos.component';
import { ConsultasComponent } from './consultas/consultas.component';
import { ChatbotComponent } from './chatbot/chatbot.component';


export const authRoutes: Routes = [
    {
        path: '', redirectTo: 'documentos-generados', pathMatch:'full'
    },
    {
        path: '',
        children: [
            {
                path: 'documentos-generados',
                component: DocumentosComponent,
            },
            {
                path: 'consulta-ia',
                component: ConsultasComponent,
            },
            {
                path: 'chatbot',
                component: ChatbotComponent,
            },
            {
                path: '**',
                redirectTo: '',
            },
        ],
    }
]

export default authRoutes;
