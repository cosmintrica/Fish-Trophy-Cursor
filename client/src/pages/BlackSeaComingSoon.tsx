import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Fish, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const BlackSeaComingSoon: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-6">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Marea Neagră
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Secțiunea dedicată pescuitului în Marea Neagră va fi disponibilă în curând!
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="max-w-2xl mx-auto mb-12">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-gray-900">În Dezvoltare</CardTitle>
            <CardDescription className="text-lg">
              Lucrăm la o experiență completă pentru pescuitul în Marea Neagră
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <Fish className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Specii Marine</h3>
                <p className="text-sm text-gray-600">
                  Catalog complet cu speciile din Marea Neagră
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <MapPin className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-gray-900 mb-1">Locații Speciale</h3>
                <p className="text-sm text-gray-600">
                  Puncte de pescuit optimale pe coasta românească
                </p>
              </div>
            </div>
            
            <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-2">Ce vei găsi aici:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Hărți interactive cu locațiile de pescuit</li>
                <li>• Ghiduri pentru speciile marine</li>
                <li>• Recorduri și clasamente speciale</li>
                <li>• Informații despre sezonalitate</li>
                <li>• Comunitate dedicată pescuitului marin</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Până atunci, explorează celelalte funcționalități ale platformei!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Înapoi la Acasă
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/species">
                <Fish className="w-4 h-4 mr-2" />
                Explorează Speciile
              </Link>
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Vrei să fii primul care află când va fi disponibilă? 
            <br />
            Urmărește-ne pentru actualizări!
          </p>
        </div>
      </div>
    </div>
  );
};

export default BlackSeaComingSoon;
