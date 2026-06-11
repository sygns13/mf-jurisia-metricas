import { Routes } from '@angular/router';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { InstanciasComponent } from './instancias/instancias.component';
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
                path: 'gestion-usuarios',
                component: UsuariosComponent,
            },
            {
                path: 'gestion-instancias',
                component: InstanciasComponent,
            },
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
