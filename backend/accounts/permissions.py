from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'ADMIN'
        )

class IsTeacherUser(permissions.BasePermission):
    """
    Allows access only to teacher users.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'TEACHER'
        )

class IsAdminOrTeacher(permissions.BasePermission):
    """
    Allows access to authenticated admin or teacher users.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'TEACHER']
        )

class IsKioskOrAdmin(permissions.BasePermission):
    """
    Allows access only to kiosk device accounts or admins.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['ADMIN', 'KIOSK_DEVICE']
        )
