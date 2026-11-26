from django.db import migrations


def copy_active_membership(apps, schema_editor):
    User = apps.get_model("users", "User")
    BusinessUser = apps.get_model("users", "BusinessUser")
    newest_active = (
        BusinessUser.objects.filter(is_active=True)
        .order_by("user_id", "-updated_at", "-id")
        .distinct("user_id")
    )
    for membership in newest_active:
        User.objects.filter(id=membership.user_id).update(active_business_id=membership.business_id)


def restore_is_active(apps, schema_editor):
    User = apps.get_model("users", "User")
    BusinessUser = apps.get_model("users", "BusinessUser")
    BusinessUser.objects.update(is_active=False)
    for user_id, business_id in User.objects.exclude(active_business=None).values_list("id", "active_business_id"):
        BusinessUser.objects.filter(user_id=user_id, business_id=business_id).update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_active_business'),
    ]

    operations = [
        migrations.RunPython(copy_active_membership, restore_is_active),
    ]
