import {Navigate, Outlet, useLocation} from 'react-router-dom';

import {useAuthContext} from '../providers/AuthProvider';

export const ProtectedRoute = () => {
    const {status} = useAuthContext();
    const location = useLocation();

    if (status === 'loading' || status === 'idle') {
        return <div>Загрузка...</div>;
    }

    if (status !== 'authenticated') {
        return <Navigate to="/login" state={{from: location}} replace/>;
    }

    return <Outlet/>;
};
