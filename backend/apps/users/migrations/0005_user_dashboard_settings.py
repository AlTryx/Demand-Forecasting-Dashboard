from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_remove_businessuser_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='currency',
            field=models.CharField(choices=[('EUR', 'EUR'), ('USD', 'USD')], default='EUR', max_length=3),
        ),
        migrations.AddField(
            model_name='user',
            name='horizon_days',
            field=models.PositiveSmallIntegerField(choices=[(7, '7 days'), (14, '14 days'), (30, '30 days')], default=30),
        ),
        migrations.AddField(
            model_name='user',
            name='stockout_alerts',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='user',
            name='weekly_digest',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='user',
            name='live_stream',
            field=models.BooleanField(default=True),
        ),
    ]
