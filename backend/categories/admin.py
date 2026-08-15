from django.contrib import admin
from .models import Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store', 'is_active', 'sort_order')
    search_fields = ('name', 'slug', 'store__name')
    list_filter = ('is_active',)
